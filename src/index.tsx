import {Timeline} from "./classes/timeline";
const video = document.getElementById("video") as HTMLVideoElement;
const timeline = new Timeline(video);

let counter = 0;
document.getElementById("add").addEventListener("click", () => {
  const img = document.createElement("img");
  img.id = `id${counter}`;
  ++counter;
  img.src = "https://i.pinimg.com/originals/b2/76/af/b276af58ff041b951321765eec87ce29.png";
  document.body.appendChild(img);
  timeline.addElement(img);
  timeline.selectElement(img);
});
