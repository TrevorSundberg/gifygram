import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import {RenderFrameEvent, Renderer} from "./classes/renderer";
import {VideoEncoder, VideoProgressEvent} from "./classes/videoEncoder";
import $ from "jquery";
import {Manager} from "./classes/manager";
import {Modal} from "./classes/modal";
import {ModalProgress} from "./classes/modalProgress";
import {VideoPlayer} from "./classes/videoPlayer";
const container = document.getElementById("container") as HTMLDivElement;
const widgetContainer = document.getElementById("widgets") as HTMLDivElement;
const player = new VideoPlayer(container);
const manager = new Manager(container, widgetContainer, player);

document.getElementById("sprite").addEventListener("click", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const src = require("./public/sample.png").default;
  const widget = await manager.addWidget({src, type: "image"});
  widget.element.focus();
});

document.getElementById("text").addEventListener("click", async () => {
  const widget = await manager.addWidget({type: "text"});
  widget.element.focus();
});

document.getElementById("save").addEventListener("click", async () => {
  const value = JSON.stringify(manager.save());
  const textArea = $("<textarea autofocus></textarea>");
  textArea.addClass("md-textarea");
  textArea.addClass("form-control");
  textArea.val(value);
  const div = $("<div>Copy the save data from below:</div>");
  div.append(textArea);
  const modal = new Modal();
  modal.open("Save", div, true, [{dismiss: true, name: "OK"}]);
});

document.getElementById("load").addEventListener("click", async () => {
  const textArea = $("<textarea autofocus></textarea>");
  textArea.addClass("md-textarea");
  textArea.addClass("form-control");
  const div = $("<div>Paste saved data into the text area and click Load:</div>");
  div.append(textArea);
  const modal = new Modal();
  const result = await modal.open("Load", div, true, [
    {dismiss: true, name: "Cancel"},
    {dismiss: true, name: "Load"}
  ]);
  if (result && result.name === "Load") {
    manager.load(JSON.parse(textArea.val() as string));
  }
});

document.getElementById("motion").addEventListener("click", async () => {
  const {MotionTracker} = await import("./classes/motionTracker");
  const motionTracker = new MotionTracker(player);
  motionTracker.addPoint(300, 300);
  const modal = new ModalProgress();
  modal.open("Tracking", $(), false, [
    {
      callback: async () => {
        await motionTracker.stop();
        modal.hide();
      },
      name: "Stop"
    }
  ]);
  const onFrame = async (event: RenderFrameEvent) => {
    modal.setProgress(event.progress, "");
  };
  motionTracker.addEventListener("frame", onFrame);
  await motionTracker.track();
  motionTracker.removeEventListener("frame", onFrame);
});

const download = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.click();
};

document.getElementById("record").addEventListener("click", async () => {
  manager.selectWidget(null);
  const videoEncoder = new VideoEncoder();
  const renderer = new Renderer(widgetContainer, player);
  const modal = new ModalProgress();
  modal.open("Rendering & Encoding", $(), false, [
    {
      callback: async () => {
        await renderer.stop();
        modal.hide();
      },
      name: "Cancel"
    }
  ]);
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
});
