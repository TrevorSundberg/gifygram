import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {RenderFrameEvent, Renderer} from "./classes/renderer";
import {Manager} from "./classes/manager";
import {Modal} from "./classes/modal";
import {VideoEncoder} from "./classes/videoEncoder";
import {VideoPlayer} from "./classes/videoPlayer";
const container = document.getElementById("container") as HTMLDivElement;
const widgetContainer = document.getElementById("widgets") as HTMLDivElement;
const player = new VideoPlayer(container);
const timeline = new Manager(container, widgetContainer, player);

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

const download = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.click();
};

const videoEncoder = new VideoEncoder();
const renderer = new Renderer(widgetContainer, player, 1 / 30);
renderer.addEventListener("frame", (event: RenderFrameEvent) => {
  videoEncoder.addFrame(event.pngData);
});

document.getElementById("record").addEventListener("click", async () => {
  const modal = new Modal();
  modal.open("Waiting for rendering", [
    {
      callback: () => renderer.cancel(),
      name: "Cancel"
    }
  ]);
  if (await renderer.render()) {
    const blob = await videoEncoder.encode();
    download(URL.createObjectURL(blob), "output.mp4");
  }
  modal.hide();
});
