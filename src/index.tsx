import {Manager} from "./classes/manager";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2canvas: typeof import("html2canvas").default = require("html2canvas");
const video = document.getElementById("video") as HTMLVideoElement;
const container = document.getElementById("container") as HTMLDivElement;
const timeline = new Manager(container, video);

document.getElementById("sprite").addEventListener("click", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const src = require("./public/sample.png").default;
  const widget = await timeline.addWidget({src, type: "image"});
  widget.element.focus();
});

document.getElementById("text").addEventListener("click", async () => {
  const widget = await timeline.addWidget({type: "text"});
  widget.element.focus();
});

const data = document.getElementById("data") as HTMLTextAreaElement;

document.getElementById("save").addEventListener("click", async () => {
  data.value = JSON.stringify(timeline.save());
});

document.getElementById("load").addEventListener("click", async () => {
  timeline.load(JSON.parse(data.value));
});

const videoCanvas = document.createElement("canvas");
const context = videoCanvas.getContext("2d");
document.body.appendChild(videoCanvas);
document.getElementById("screenshot").addEventListener("click", async () => {
  const width = video.videoWidth;
  const height = video.videoHeight;
  videoCanvas.width = width;
  videoCanvas.height = height;
  const canvasWithoutVideo = await html2canvas(container, {
    backgroundColor: "rgba(0,0,0,0)"
  });
  context.drawImage(video, 0, 0, width, height);
  context.drawImage(canvasWithoutVideo, 0, 0, width, height);
});
