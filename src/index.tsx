import {Timeline} from "./classes/timeline";
const video = document.getElementById("video") as HTMLVideoElement;
const timeline = new Timeline(video);
timeline.createWidget(document.getElementById("test"));
