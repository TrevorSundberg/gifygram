import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import "@fortawesome/fontawesome-free/css/brands.css";
import {Deferred, NeverAsync, Utility, canvasToArrayBuffer} from "./classes/utility";
import {RenderFrameEvent, Renderer} from "./classes/renderer";
import $ from "jquery";
import {Background} from "./classes/background";
import {Manager} from "./classes/manager";
import {Modal} from "./classes/modal";
import {ModalProgress} from "./classes/modalProgress";
import {StickerSearch} from "./classes/stickerSearch";
import TextToSVG from "text-to-svg";
import {Timeline} from "./classes/timeline";
import {VideoEncoder} from "./classes/videoEncoder";
import {VideoEncoderWebm} from "./classes/videoEncoderWebm";
import {VideoPlayer} from "./classes/videoPlayer";
import svgToMiniDataURI from "mini-svg-data-uri";
const videoParent = document.getElementById("container") as HTMLDivElement;
const widgetContainer = document.getElementById("widgets") as HTMLDivElement;
const player = new VideoPlayer(videoParent, document.body);
const timeline = new Timeline();
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas, widgetContainer, player, timeline);
const background = new Background(document.body, player.video);
const manager = new Manager(background, videoParent, widgetContainer, player, timeline, renderer);

const workerUrl = "https://www.welderengine.workers.dev";

window.onbeforeunload = () => {
  if (manager.hasUnsavedChanges && location.protocol === "https:") {
    return "Do you want to leave this page and discard your changes?";
  }
  // eslint-disable-next-line no-undefined
  return undefined;
};

const urlDataParameter = "data";
const urlParams = new URLSearchParams(window.location.search);
const urlData = urlParams.get(urlDataParameter);
if (urlData) {
  manager.loadFromBase64(urlData);
} else {
  player.setAttributedSrc({
    attribution: "",
    src: require("./public/sample.mp4").default as string
  });
}

document.getElementById("github").addEventListener(
  "click",
  () => window.open("https://github.com/TrevorSundberg/madeitforfun")
);

document.getElementById("sticker").addEventListener("click", async () => {
  const attributedSource = await StickerSearch.searchForStickerUrl("sticker");
  if (attributedSource) {
    await manager.addWidget({attributedSource, type: "gif"});
  }
});

const fontPromise = new Promise<any>((resolve, reject) => {
  const src = require("./public/NotoSans-Regular.ttf").default as string;
  TextToSVG.load(src, (err, textToSVG) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(textToSVG);
  });
});

document.getElementById("text").addEventListener("click", async () => {
  const input = $("<input type='text' class='md-textarea form-control' autofocus></textarea>");
  const modal = new Modal();
  const button = await modal.open({
    buttons: [{dismiss: true, name: "OK", submitOnEnter: true}],
    content: input,
    dismissable: true,
    title: "Text"
  });
  const text = input.val();
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

document.getElementById("video").addEventListener("click", async () => {
  const attributedSource = await StickerSearch.searchForStickerUrl("video");
  if (attributedSource) {
    await player.setAttributedSrc(attributedSource);
  }
});

const render = async () => {
  const modal = new ModalProgress();
  const videoEncoder: VideoEncoder = new VideoEncoderWebm();
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
  player.hideVideo();
  manager.updateExternally = true;
  manager.selectWidget(null);
  let firstFramePng: ArrayBuffer = null;
  renderer.onRenderFrame = async (event: RenderFrameEvent) => {
    if (firstFramePng === null) {
      firstFramePng = await canvasToArrayBuffer(renderer.resizeCanvas, "image/png");
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
  player.showVideo();
  return {firstFramePng, videoBlob};
};

const makeLengthBuffer = (size: number) => {
  const view = new DataView(new ArrayBuffer(4));
  view.setUint32(0, size, true);
  return view.buffer;
};

const makePost = async () => {
  const result = await render();
  if (result) {
    const jsonBuffer = new TextEncoder().encode(manager.saveToJson());
    const videoBuffer = await result.videoBlob.arrayBuffer();
    const thumbnailBuffer = result.firstFramePng;

    const blob = new Blob([
      makeLengthBuffer(jsonBuffer.byteLength),
      jsonBuffer,
      makeLengthBuffer(videoBuffer.byteLength),
      videoBuffer,
      makeLengthBuffer(thumbnailBuffer.byteLength),
      thumbnailBuffer
    ]);
    const response = await fetch(`${workerUrl}/api/post/create`, {
      body: blob,
      method: "POST"
    });
    console.log(await response.text());
  }
};

document.getElementById("share").addEventListener("click", (): NeverAsync => {
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
    buttons: [
      {
        callback: makePost,
        dismiss: true,
        name: "Post"
      },
      {dismiss: true, name: "OK"}
    ],
    content: div,
    dismissable: true,
    title: "Share"
  });
});

document.getElementById("motion").addEventListener("click", async () => {
  const {selection} = manager;
  if (!selection) {
    await Modal.messageBox("Motion Tracking", "You must have something selected to perform motion tracking");
    return;
  }
  const motionTrackerPromise = new Deferred<import("./classes/motionTracker").MotionTracker>();
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

  const {MotionTracker} = await import("./classes/motionTracker");
  const motionTracker = new MotionTracker(player);
  motionTrackerPromise.resolve(motionTracker);

  const transform = Utility.getTransform(selection.widget.element);
  motionTracker.addPoint(transform.translate[0], transform.translate[1]);

  motionTracker.onMotionFrame = async (event: import("./classes/motionTracker").MotionTrackerEvent) => {
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

document.getElementById("render").addEventListener("click", async () => {
  const filename = `MadeItForFun-${new Date().toISOString().
    replace(/[^a-zA-Z0-9-]/ug, "-")}`;
  const result = await render();
  if (result.videoBlob) {
    download(URL.createObjectURL(result.videoBlob), filename);
  }
});

document.getElementById("visibility").addEventListener("click", async () => {
  manager.attemptToggleVisibility();
});

document.getElementById("delete").addEventListener("click", async () => {
  manager.attemptDeleteSelection();
});

document.getElementById("clear").addEventListener("click", async () => {
  timeline.deleteKeyframesInRange(player.getSelectionRangeInOrder());
  manager.updateChanges();
});

$(() => {
  $("[data-toggle=\"tooltip\"]").tooltip();
});
