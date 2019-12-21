import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {Manager} from "./classes/manager";
import {createWorker} from "@ffmpeg/ffmpeg";
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

const canvasToArrayBuffer = async (canvas: HTMLCanvasElement, mimeType: string) => {
  let resolver: (buffer: ArrayBuffer) => void = null;
  const promise = new Promise<ArrayBuffer>((resolve) => {
    resolver = resolve;
  });
  canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.addEventListener("loadend", () => {
      resolver(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(blob);
  }, mimeType);
  return promise;
};

const download = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.click();
};

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
  const buffer = await canvasToArrayBuffer(videoCanvas, "image/png");
  const worker = createWorker({
    logger: (message) => console.log(message)
  });
  await worker.load();
  await worker.write("test.png", new Uint8Array(buffer));
  await worker.run("-i /data/test.png output.mp4", {
    output: "output.mp4"
  });
  const output = (await worker.read("output.mp4")).data;
  const blob = new Blob([output], {
    type: "video/mp4"
  });
  download(URL.createObjectURL(blob), "output.mp4");
  console.log(output);
});
