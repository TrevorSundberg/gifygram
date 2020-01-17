import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import {NeverAsync, Utility} from "./classes/utility";
import {RenderFrameEvent, Renderer} from "./classes/renderer";
import {VideoEncoder, VideoProgressEvent} from "./classes/videoEncoder";
import $ from "jquery";
import {Manager} from "./classes/manager";
import {Modal} from "./classes/modal";
import {ModalProgress} from "./classes/modalProgress";
import {StickerSearch} from "./classes/stickerSearch";
import TextToSVG from "text-to-svg";
import {Timeline} from "./classes/timeline";
import {VideoPlayer} from "./classes/videoPlayer";
import svgToMiniDataURI from "mini-svg-data-uri";
const container = document.getElementById("container") as HTMLDivElement;
const widgetContainer = document.getElementById("widgets") as HTMLDivElement;
const player = new VideoPlayer(container);
const timeline = new Timeline();
const manager = new Manager(container, widgetContainer, player, timeline);

const urlDataParameter = "data";
const urlParams = new URLSearchParams(window.location.search);
const urlData = urlParams.get(urlDataParameter);
if (urlData) {
  manager.loadFromBase64(urlData);
}

document.getElementById("sprite").addEventListener("click", async () => {
  const src = await StickerSearch.searchForStickerUrl();
  if (src) {
    await manager.addWidget({src, type: "image"});
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
  const textArea = $("<textarea class='md-textarea form-control' autofocus></textarea>");
  const div = $("<div>Copy the save data from below:</div>");
  div.append(textArea);
  const modal = new Modal();
  const button = await modal.open({
    buttons: [{dismiss: true, name: "OK"}],
    content: div,
    dismissable: true,
    title: "Text"
  });
  if (button) {
    const textToSVG = await fontPromise;
    const svgText = textToSVG.getSVG(textArea.val(), {
      anchor: "left top",
      attributes: {
        fill: "white",
        stroke: "black"
      }
    });
    const svg = $(svgText);
    const src = svgToMiniDataURI(svg.get(0).outerHTML) as string;
    await manager.addWidget({src, type: "text"});
  }
});

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
  const div = $("<div>Link was copied to the clipboard. You may also copy it below:</div>");
  div.append(textArea);
  const modal = new Modal();
  modal.open({
    buttons: [{dismiss: true, name: "OK"}],
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
  const {MotionTracker} = await import("./classes/motionTracker");
  const motionTracker = new MotionTracker(player);
  const transform = Utility.getTransform(selection.widget.element);
  motionTracker.addPoint(transform.translate[0], transform.translate[1]);
  const modal = new ModalProgress();
  modal.open({
    buttons: [
      {
        callback: async () => {
          await motionTracker.stop();
          modal.hide();
        },
        name: "Stop"
      }
    ],
    title: "Tracking"
  });
  const onFrame = async (event: import("./classes/motionTracker").MotionTrackerEvent) => {
    modal.setProgress(event.progress, "");
    if (event.found) {
      transform.translate[0] = event.x;
      transform.translate[1] = event.y;
      selection.setTransform(transform);
      selection.emitKeyframe();
    }
  };
  motionTracker.addEventListener("frame", onFrame);
  await motionTracker.track();
  motionTracker.removeEventListener("frame", onFrame);
  modal.hide();
});

const download = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.click();
};

document.getElementById("record").addEventListener("click", async () => {
  player.hideVideo();
  manager.updateExternally = true;
  manager.selectWidget(null);
  const videoEncoder = new VideoEncoder();
  await videoEncoder.addVideo(player);
  const renderer = new Renderer(widgetContainer, player, timeline);
  const modal = new ModalProgress();
  modal.open({
    buttons: [
      {
        callback: async () => {
          await renderer.stop();
          modal.hide();
        },
        name: "Cancel"
      }
    ],
    title: "Rendering & Encoding"
  });
  const onRenderFrame = async (event: RenderFrameEvent) => {
    const frame = await videoEncoder.addFrame(event.pngData);
    modal.setProgress(event.progress, `Rendering Frame: ${frame}`);
  };
  const onVideoEncoderProgress = (event: VideoProgressEvent) => {
    modal.setProgress(event.progress, "Encoding");
  };
  videoEncoder.addEventListener("progress", onVideoEncoderProgress);
  renderer.addEventListener("frame", onRenderFrame);
  if (await renderer.render()) {
    const blob = await videoEncoder.encode();
    download(URL.createObjectURL(blob), "output.mp4");
  }
  modal.hide();
  videoEncoder.removeEventListener("progress", onVideoEncoderProgress);
  renderer.removeEventListener("frame", onRenderFrame);
  manager.updateExternally = false;
  player.showVideo();
});
