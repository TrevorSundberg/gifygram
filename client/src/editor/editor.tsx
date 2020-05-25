import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import "@fortawesome/fontawesome-free/css/brands.css";
import "./editor.css";
import {
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON,
  API_POST_CREATE_MAX_MESSAGE_LENGTH,
  API_POST_CREATE_MAX_TITLE_LENGTH
} from "../../../common/common";
import {Deferred, NeverAsync, THUMBNAIL_DOWNSAMPLE, Utility, canvasToArrayBuffer} from "./utility";
import {Manager, SerializedData} from "./manager";
import {RenderFrameEvent, Renderer} from "./renderer";
import {checkResponseJson, makeUrl} from "../shared/shared";
import $ from "jquery";
import {Background} from "./background";
import {Modal} from "./modal";
import {ModalProgress} from "./modalProgress";
import React from "react";
import {StickerSearch} from "./stickerSearch";
import {TextField} from "@material-ui/core";
import TextToSVG from "text-to-svg";
import {Timeline} from "./timeline";
import {VideoEncoder} from "./videoEncoder";
import {VideoEncoderH264MP4} from "./videoEncoderH264MP4";
import {VideoPlayer} from "./videoPlayer";
import {signInIfNeeded} from "../shared/auth";
import svgToMiniDataURI from "mini-svg-data-uri";

export class Editor {
  public root: JQuery;

  public unloadCallback: () => void;

  private background: Background;

  private manager: Manager;

  private tooltips: JQuery<HTMLElement>;

  public constructor (parent: HTMLElement, history: import("history").History, remixId?: string) {
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
        const response = await fetch(makeUrl(API_ANIMATION_JSON, {id: remixId}));
        const animation: SerializedData = checkResponseJson(await response.json());
        manager.load(animation);
      })();
    } else {
      player.setAttributedSrc({
        attribution: "",
        src: require("../public/sample.mp4").default as string
      });
    }

    getElement("github").addEventListener(
      "click",
      () => window.open("https://github.com/TrevorSundberg/madeitforfun")
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
        // eslint-disable-next-line react/display-name
        render: () => <TextField onChange={(e) => {
          text = e.target.value;
        }} autoFocus={true}/>,
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
            attribution: "",
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
      manager.selectWidget(null);
      let firstFrameJpeg: ArrayBuffer = null;
      renderer.onRenderFrame = async (event: RenderFrameEvent) => {
        if (firstFrameJpeg === null) {
          const downsampleCanvas = document.createElement("canvas");
          downsampleCanvas.width = renderer.resizeCanvas.width / THUMBNAIL_DOWNSAMPLE;
          downsampleCanvas.height = renderer.resizeCanvas.height / THUMBNAIL_DOWNSAMPLE;
          const downsampleContext = downsampleCanvas.getContext("2d");
          downsampleContext.drawImage(renderer.resizeCanvas, 0, 0, downsampleCanvas.width, downsampleCanvas.height);
          firstFrameJpeg = await canvasToArrayBuffer(downsampleCanvas, "image/jpeg");
        }
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
      return {firstFrameJpeg, videoBlob};
    };

    const makeLengthBuffer = (size: number) => {
      const view = new DataView(new ArrayBuffer(4));
      view.setUint32(0, size, true);
      return view.buffer;
    };

    const makePost = async (title: string, message: string) => {
      const headers = await signInIfNeeded();
      const result = await render();
      if (result) {
        const jsonBuffer = new TextEncoder().encode(manager.saveToJson());
        const videoBuffer = await result.videoBlob.arrayBuffer();
        const thumbnailBuffer = result.firstFrameJpeg;

        const blob = new Blob([
          makeLengthBuffer(jsonBuffer.byteLength),
          jsonBuffer,
          makeLengthBuffer(videoBuffer.byteLength),
          videoBuffer,
          makeLengthBuffer(thumbnailBuffer.byteLength),
          thumbnailBuffer
        ]);
        const response = await fetch(makeUrl(API_ANIMATION_CREATE, {
          title,
          message,
          ...remixId ? {replyId: remixId} : {}
        }), {
          body: blob,
          method: "POST",
          headers
        });
        const post: {id: string; threadId: string} = checkResponseJson(await response.json());
        // If the user goes back to the editor in history, they'll be editing a remix of their post.
        history.replace(`/?remixId=${post.id}`);
        if (post.id === post.threadId) {
          history.push(`/thread?threadId=${post.threadId}`);
        } else {
          history.push(`/thread?threadId=${post.threadId}#${post.id}`);
        }
      }
    };

    getElement("post").addEventListener("click", (): NeverAsync => {
      manager.selectWidget(null);
      const content = $(require("./post.html").default);
      const title = content.find("#title") as JQuery<HTMLTextAreaElement>;
      title.attr("maxlength", API_POST_CREATE_MAX_TITLE_LENGTH);
      const message = content.find("#message") as JQuery<HTMLTextAreaElement>;
      message.attr("maxlength", API_POST_CREATE_MAX_MESSAGE_LENGTH);
      const modal = new Modal();
      modal.open({
        buttons: [
          {
            callback: () => makePost(
              title.val() as string,
              message.val() as string
            ),
            dismiss: true,
            submitOnEnter: true,
            name: "Post"
          }
        ],
        content,
        dismissable: true,
        title: "Post"
      });
    });

    getElement("share").addEventListener("click", (): NeverAsync => {
      manager.selectWidget(null);
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
      if (result.videoBlob) {
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
  }
}
