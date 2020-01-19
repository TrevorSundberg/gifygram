import "./background.css";
import {FRAME_TIME} from "./utility";

export class Background {
  public constructor (parent: HTMLElement, video: HTMLVideoElement) {
    const canvas = document.createElement("canvas");
    canvas.className = "background";

    const context = canvas.getContext("2d");
    const drawVideo = () => {
      context.drawImage(video, 0, 0, window.innerWidth, window.innerHeight);
    };
    const updateDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawVideo();
    };
    updateDimensions();
    parent.prepend(canvas);

    window.addEventListener("resize", updateDimensions);
    video.addEventListener("seeked", drawVideo);
    setInterval(drawVideo, FRAME_TIME * 1000);
  }
}
