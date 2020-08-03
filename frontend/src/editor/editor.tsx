import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import "@fortawesome/fontawesome-free/css/brands.css";
import "./editor.css";
import {
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON
} from "../../../common/common";
import {
  Auth,
  Deferred,
  EVENT_MENU_OPEN,
  NeverAsync,
  abortableJsonFetch,
  isDevEnvironment,
  makeLocalUrl
} from "../shared/shared";
import {MODALS_CHANGED, Modal, allModals} from "./modal";
import {RenderFrameEvent, Renderer} from "./renderer";
import $ from "jquery";
import {Background} from "./background";
import {Manager} from "./manager";
import {ModalProgress} from "./modalProgress";
import React from "react";
import {StickerSearch} from "./stickerSearch";
import TextField from "@material-ui/core/TextField";
import TextToSVG from "text-to-svg";
import {Timeline} from "./timeline";
import {Utility} from "./utility";
import {VideoEncoder} from "./videoEncoder";
import {VideoEncoderH264MP4} from "./videoEncoderH264MP4";
import {VideoPlayer} from "./videoPlayer";
import svgToMiniDataURI from "mini-svg-data-uri";

export class Editor {
  public root: JQuery;

  public unloadCallback: () => void;

  public modalChangedCallback: () => void;

  private background: Background;

  private manager: Manager;

  public constructor (parent: HTMLElement, history: import("history").History, remixId?: string) {
    document.documentElement.style.overflow = "hidden";
    this.root = $(require("./editor.html").default).appendTo(parent);

    const getElement = (name: string) => this.root.find(`#${name}`).get(0);

    const videoParent = getElement("container") as HTMLDivElement;
    const widgetContainer = getElement("widgets") as HTMLDivElement;
    const player = new VideoPlayer(videoParent, parent);
    const timeline = new Timeline();
    const canvas = getElement("canvas") as HTMLCanvasElement;
    const renderer = new Renderer(canvas, widgetContainer, player, timeline);
    const background = new Background(parent, player.video);
    this.background = background;
    const manager = new Manager(background, videoParent, widgetContainer, player, timeline, renderer);
    this.manager = manager;

    this.modalChangedCallback = () => {
      // Only deselect if we have a modal up.
      if (allModals.length > 0) {
        manager.selectWidget(null);
      }
    };
    window.addEventListener(MODALS_CHANGED, this.modalChangedCallback);

    this.unloadCallback = () => {
      if (manager.hasUnsavedChanges && location.protocol === "https:") {
        return "Do you want to leave this page and discard your changes?";
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    };
    window.onbeforeunload = this.unloadCallback;

    (async () => {
      manager.spinner.show();
      if (remixId) {
        const animation = await abortableJsonFetch(API_ANIMATION_JSON, Auth.Optional, {id: remixId});
        manager.load(animation);
      } else {
        await player.setAttributedSrc({
          originUrl: "",
          title: "",
          previewUrl: "",
          mimeType: "video/mp4",
          src: isDevEnvironment()
            ? require("../public/sample.webm").default as string
            : require("../public/sample.mp4").default as string
        });
      }
      manager.spinner.hide();
    })();

    getElement("menu").addEventListener(
      "click",
      () => window.dispatchEvent(new Event(EVENT_MENU_OPEN))
    );

    getElement("sticker").addEventListener("click", async () => {
      const attributedSource = await StickerSearch.searchForStickerUrl("stickers");
      if (attributedSource) {
        await manager.addWidget({attributedSource});
      }
    });

    const fontPromise = new Promise<any>((resolve, reject) => {
      const src = require("../public/arvo.ttf").default as string;
      TextToSVG.load(src, (err, textToSVG) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(textToSVG);
      });
    });

    getElement("text").addEventListener("click", async () => {
      const modal = new Modal();
      let text = "";
      const button = await modal.open({
        buttons: [{dismiss: true, name: "OK", submitOnEnter: true}],
        render: () => <TextField fullWidth id="text-input" autoFocus onChange={(e) => {
          text = e.target.value;
        }}/>,
        dismissable: true,
        title: "Text"
      });
      if (button && text) {
        const textToSVG = await fontPromise;
        const svgText = textToSVG.getSVG(text, {
          anchor: "left top",
          attributes: {
            fill: "white",
            stroke: "black"
          }
        });
        const svg = $(svgText);
        const src = svgToMiniDataURI(svg.get(0).outerHTML) as string;
        await manager.addWidget({
          attributedSource: {
            originUrl: "",
            title: "",
            previewUrl: "",
            mimeType: "image/svg+xml",
            src
          }
        });
      }
    });

    getElement("video").addEventListener("click", async () => {
      const attributedSource = await StickerSearch.searchForStickerUrl("gifs");
      if (attributedSource) {
        manager.spinner.show();
        await player.setAttributedSrc(attributedSource);
        manager.spinner.hide();
      }
    });

    const render = async () => {
      const modal = new ModalProgress();
      const videoEncoder: VideoEncoder = new VideoEncoderH264MP4();
      modal.open({
        buttons: [
          {
            callback: async () => {
              await renderer.stop();
              await videoEncoder.stop();
            },
            name: "Cancel"
          }
        ],
        title: "Rendering & Encoding"
      });
      await videoEncoder.initialize(
        renderer.resizeCanvas,
        renderer.resizeContext,
        player,
        (progress) => modal.setProgress(progress, "Encoding")
      );
      manager.updateExternally = true;
      renderer.onRenderFrame = async (event: RenderFrameEvent) => {
        await videoEncoder.processFrame();
        modal.setProgress(event.progress, "Rendering");
      };
      const videoBlob = await (async () => {
        if (await renderer.render()) {
          return videoEncoder.getOutputVideo();
        }
        return null;
      })();
      modal.hide();
      renderer.onRenderFrame = null;
      manager.updateExternally = false;
      if (videoBlob) {
        return {
          videoBlob,
          width: renderer.resizeCanvas.width,
          height: renderer.resizeCanvas.height
        };
      }
      return null;
    };

    const makeLengthBuffer = (size: number) => {
      const view = new DataView(new ArrayBuffer(4));
      view.setUint32(0, size, true);
      return view.buffer;
    };

    const makePost = async (title: string, message: string) => {
      const result = await render();
      if (result) {
        const jsonBuffer = new TextEncoder().encode(JSON.stringify(manager.save()));
        const videoBuffer = await result.videoBlob.arrayBuffer();

        const blob = new Blob([
          makeLengthBuffer(jsonBuffer.byteLength),
          jsonBuffer,
          makeLengthBuffer(videoBuffer.byteLength),
          videoBuffer
        ]);
        const post = await abortableJsonFetch(
          API_ANIMATION_CREATE,
          Auth.Required,
          {
            title,
            message,
            width: result.width,
            height: result.height,
            replyId: remixId
          },
          blob
        );

        // If the user goes back to the editor in history, they'll be editing a remix of their post.
        history.replace(makeLocalUrl("/editor", {remixId: post.id}));
        if (post.id === post.threadId) {
          history.push(makeLocalUrl("/thread", {threadId: post.threadId}));
        } else {
          history.push(makeLocalUrl("/thread", {threadId: post.threadId}, post.id));
        }
      }
    };

    getElement("post").addEventListener("click", (): NeverAsync => {
      let title = "";
      let message = "";
      const modal = new Modal();
      modal.open({
        buttons: [
          {
            callback: () => makePost(title, message),
            dismiss: true,
            submitOnEnter: true,
            name: "Post"
          }
        ],
        render: () => <div>
          <div>
            <TextField
              id="post-title"
              fullWidth
              autoFocus
              label="Title"
              inputProps={{maxLength: API_ANIMATION_CREATE.props.title.maxLength}}
              onChange={(e) => {
                title = e.target.value;
              }}/>
          </div>
          <div>
            <TextField
              id="post-message"
              fullWidth
              label="Message"
              inputProps={{maxLength: API_ANIMATION_CREATE.props.message.maxLength}}
              onChange={(e) => {
                message = e.target.value;
              }}/>
          </div>
        </div>,
        dismissable: true,
        title: "Post"
      });
    });

    getElement("motion").addEventListener("click", async () => {
      const {selection} = manager;
      if (!selection) {
        await Modal.messageBox("Motion Tracking", "You must have something selected to perform motion tracking");
        return;
      }
      const motionTrackerPromise = new Deferred<import("./motionTracker").MotionTracker>();
      const modal = new ModalProgress();
      modal.open({
        buttons: [
          {
            callback: async () => {
              await (await motionTrackerPromise).stop();
              modal.hide();
            },
            name: "Stop"
          }
        ],
        title: "Tracking"
      });

      const {MotionTracker} = await import("./motionTracker");
      const motionTracker = new MotionTracker(player);
      motionTrackerPromise.resolve(motionTracker);

      const transform = Utility.getTransform(selection.widget.element);
      motionTracker.addPoint(transform.translate[0], transform.translate[1]);

      motionTracker.onMotionFrame = async (event: import("./motionTracker").MotionTrackerEvent) => {
        modal.setProgress(event.progress, "");
        if (event.found) {
          transform.translate[0] = event.x;
          transform.translate[1] = event.y;
          selection.setTransform(transform);
          selection.emitKeyframe();
        }
      };
      await motionTracker.track();
      motionTracker.onMotionFrame = null;
      modal.hide();
    });

    getElement("visibility").addEventListener("click", async () => {
      if (!this.manager.selection) {
        await Modal.messageBox("Toggle Visibility", "You must have something selected to toggle visibility");
        return;
      }
      const {element} = this.manager.selection.widget;
      manager.toggleVisibility(element);
    });

    getElement("delete").addEventListener("click", async () => {
      manager.attemptDeleteSelection();
    });

    getElement("clear").addEventListener("click", async () => {
      const {selection} = manager;
      if (!selection) {
        await Modal.messageBox("Clear Keyframes", "You must have something selected to delete its key frames");
        return;
      }
      const range = player.getSelectionRangeInOrder();
      if (range[0] === range[1]) {
        await Modal.messageBox(
          "Clear Keyframes",
          "No keyframes were selected. Click and drag on the timeline to create a blue keyframe selection."
        );
        return;
      }
      if (!timeline.deleteKeyframesInRange(`#${selection.widget.init.id}`, range)) {
        await Modal.messageBox("Clear Keyframes", "No keyframes were deleted");
        return;
      }
      manager.updateChanges();
    });
  }

  public destroy () {
    if (window.onbeforeunload === this.unloadCallback) {
      window.onbeforeunload = null;
    }
    this.background.destroy();
    this.manager.destroy();
    this.root.remove();
    window.removeEventListener(MODALS_CHANGED, this.modalChangedCallback);
    document.documentElement.style.overflow = null;
  }
}
