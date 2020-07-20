import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import "@fortawesome/fontawesome-free/css/brands.css";
import "./editor.css";
import {
  API_ALL_THREADS_ID,
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON
} from "../../../common/common";
import {Auth, Deferred, EVENT_MENU_OPEN, NeverAsync, abortableJsonFetch, isDevEnvironment, makeLocalUrl} from "../shared/shared";
import {MODALS_CHANGED, Modal} from "./modal";
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
import {cacheAdd} from "../shared/cache";
import svgToMiniDataURI from "mini-svg-data-uri";

export class Editor {
  public root: JQuery;

  public unloadCallback: () => void;

  public modalChangedCallback: () => void;

  private background: Background;

  private manager: Manager;

  private tooltips: JQuery<HTMLElement>;

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

    this.modalChangedCallback = () => manager.selectWidget(null);
    window.addEventListener(MODALS_CHANGED, this.modalChangedCallback);

    this.unloadCallback = () => {
      if (manager.hasUnsavedChanges && location.protocol === "https:") {
        return "Do you want to leave this page and discard your changes?";
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    };
    window.onbeforeunload = this.unloadCallback;

    const urlDataParameter = "data";
    const urlParams = new URLSearchParams(window.location.search);
    const urlData = urlParams.get(urlDataParameter);
    if (urlData) {
      manager.loadFromBase64(urlData);
    } else if (remixId) {
      (async () => {
        const animation = await abortableJsonFetch(API_ANIMATION_JSON, Auth.Optional, {id: remixId});
        manager.load(animation);
      })();
    } else {
      player.setAttributedSrc({
        originUrl: "",
        title: "",
        previewGifUrl: "",
        src: isDevEnvironment()
          ? require("../public/sample.webm").default as string
          : require("../public/sample.mp4").default as string
      });
    }

    getElement("menu").addEventListener(
      "click",
      () => window.dispatchEvent(new Event(EVENT_MENU_OPEN))
    );

    getElement("sticker").addEventListener("click", async () => {
      const attributedSource = await StickerSearch.searchForStickerUrl("sticker");
      if (attributedSource) {
        await manager.addWidget({attributedSource, type: "gif"});
      }
    });

    const fontPromise = new Promise<any>((resolve, reject) => {
      const src = require("../public/NotoSans-Regular.ttf").default as string;
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
        render: () => <TextField id="text-input" autoFocus={true} onChange={(e) => {
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
            previewGifUrl: "",
            src
          }, type: "svg"
        });
      }
    });

    getElement("video").addEventListener("click", async () => {
      const attributedSource = await StickerSearch.searchForStickerUrl("video");
      if (attributedSource) {
        await player.setAttributedSrc(attributedSource);
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
        const jsonBuffer = new TextEncoder().encode(manager.saveToJson());
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

        // Since this is creating both a post inside a thread (may be itself), cache it within that thread.
        cacheAdd(post.threadId, post);

        // If the user goes back to the editor in history, they'll be editing a remix of their post.
        history.replace(makeLocalUrl("/editor", {remixId: post.id}));
        if (post.id === post.threadId) {
          // Since this is creating a thread, also add it to the thread cache.
          cacheAdd(API_ALL_THREADS_ID, post);
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
              label="Title"
              inputProps={{maxLength: API_ANIMATION_CREATE.props.title.maxLength}}
              autoFocus={true}
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

    getElement("share").addEventListener("click", (): NeverAsync => {
      const base64 = manager.saveToBase64();
      const url = new URL(window.location.href);
      url.searchParams.set(urlDataParameter, base64);

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url.href);
      }

      const textArea = $("<textarea class='md-textarea form-control' autofocus></textarea>");
      textArea.val(url.href);
      const copySuccess = "Link was copied to the clipboard.";
      const copyFail = "Copy the link below:";
      const div = $(`<div>${navigator.clipboard ? copySuccess : copyFail}</div>`);
      div.append(textArea);
      div.append("<br>Be sure to attribute the following links/users:<br>");

      const textAreaAttribution = $("<textarea class='md-textarea form-control'></textarea>");
      textAreaAttribution.val(manager.getAttributionList().join("\n"));
      div.append(textAreaAttribution);

      const modal = new Modal();
      modal.open({
        buttons: [{dismiss: true, name: "OK"}],
        content: div,
        dismissable: true,
        title: "Share"
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

    const download = (url: string, filename: string) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename || "download";
      anchor.click();
    };

    getElement("render").addEventListener("click", async () => {
      const filename = `MadeItForFun-${new Date().toISOString().
        replace(/[^a-zA-Z0-9-]/ug, "-")}`;
      const result = await render();
      if (result) {
        download(URL.createObjectURL(result.videoBlob), filename);
      }
    });

    getElement("visibility").addEventListener("click", async () => {
      manager.attemptToggleVisibility();
    });

    getElement("delete").addEventListener("click", async () => {
      manager.attemptDeleteSelection();
    });

    getElement("clear").addEventListener("click", async () => {
      timeline.deleteKeyframesInRange(player.getSelectionRangeInOrder());
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
