import {Manager} from "./classes/manager";
const video = document.getElementById("video") as HTMLVideoElement;
const timeline = new Manager(video);

document.getElementById("sprite").addEventListener("click", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const src = require("./public/sample.png").default;
  const widget = await timeline.addWidget(Manager.createImage(src));
  widget.element.focus();
});

document.getElementById("text").addEventListener("click", async () => {
  const widget = await timeline.addWidget(Manager.createText());
  widget.element.focus();
});
