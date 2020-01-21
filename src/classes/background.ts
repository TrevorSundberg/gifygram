import "./background.css";
import {FRAME_TIME} from "./utility";

export class Background {
  public constructor (parent: HTMLElement, video: HTMLVideoElement) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    canvas.className = "background";

    const context = canvas.getContext("2d");
    const drawVideo = () => {
      context.filter = "blur(10px)";
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    };
    drawVideo();
    parent.prepend(canvas);

    window.addEventListener("resize", drawVideo);
    video.addEventListener("seeked", drawVideo);
    setInterval(drawVideo, FRAME_TIME * 1000 * 2);
  }
}
