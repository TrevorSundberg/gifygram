import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {RenderFrameEvent, Renderer} from "./classes/renderer";
import {Manager} from "./classes/manager";
import {Modal} from "./classes/modal";
import {ModalProgress} from "./classes/modalProgress";
import {VideoEncoder} from "./classes/videoEncoder";
import {VideoPlayer} from "./classes/videoPlayer";
import $ = require("jquery");
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

document.getElementById("save").addEventListener("click", async () => {
  const value = JSON.stringify(timeline.save());
  const textArea = $("<textarea></textarea>");
  textArea.addClass("md-textarea");
  textArea.addClass("form-control");
  textArea.val(value);
  const div = $("<div>Copy the save data from below:</div>");
  div.append(textArea);
  const modal = new Modal();
  modal.open("Save", div, [{isClose: true, name: "OK"}]);
});

document.getElementById("load").addEventListener("click", async () => {
  const value = JSON.stringify(timeline.save());
  const textArea = $("<textarea></textarea>");
  textArea.addClass("md-textarea");
  textArea.addClass("form-control");
  textArea.val(value);
  const div = $("<div>Paste saved data into the text area and click Load:</div>");
  div.append(textArea);
  const modal = new Modal();
  const result = await modal.open("Load", div, [
    {isClose: true, name: "Cancel"},
    {name: "Load"}
  ]);
  if (!result.isClose) {
    timeline.load(JSON.parse(textArea.val() as string || "{}"));
  }
});

const download = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.click();
};

const videoEncoder = new VideoEncoder();
const renderer = new Renderer(widgetContainer, player, 1 / 30);

document.getElementById("record").addEventListener("click", async () => {
  const modal = new ModalProgress();
  modal.open("Rendering", $(), [
    {
      callback: () => renderer.cancel(),
      name: "Cancel"
    }
  ]);
  const onFrame = async (event: RenderFrameEvent) => {
    const frame = await videoEncoder.addFrame(event.pngData);
    modal.setProgress(event.progress, `Frame: ${frame}`);
  };
  renderer.addEventListener("frame", onFrame);
  if (await renderer.render()) {
    const blob = await videoEncoder.encode();
    download(URL.createObjectURL(blob), "output.mp4");
  }
  modal.hide();
  renderer.removeEventListener("frame", onFrame);
});
