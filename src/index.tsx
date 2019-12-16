import {Manager} from "./classes/manager";
const video = document.getElementById("video") as HTMLVideoElement;
const timeline = new Manager(video);

document.getElementById("sprite").addEventListener("click", async () => {
  const src = "https://i.pinimg.com/originals/b2/76/af/b276af58ff041b951321765eec87ce29.png";
  const widget = await timeline.addWidget(Manager.createImage(src));
  widget.element.focus();
});

document.getElementById("text").addEventListener("click", async () => {
  const widget = await timeline.addWidget(Manager.createText());
  widget.element.focus();
});
