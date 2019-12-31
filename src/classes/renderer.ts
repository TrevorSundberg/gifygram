import {Deferred} from "./utility";
import {VideoPlayer} from "./videoPlayer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2canvas: typeof import("html2canvas").default = require("html2canvas");

export class RenderFrameEvent extends Event {
  public pngData: ArrayBuffer;

  public progress: number;

  public constructor () {
    super("frame");
  }
}

export class Renderer extends EventTarget {
  private widgetContainer: HTMLDivElement;

  private player: VideoPlayer;

  private frameRate: number;

  private canvas: HTMLCanvasElement;

  private context: CanvasRenderingContext2D;

  private isCancelled = false;

  public constructor (widgetContainer: HTMLDivElement, player: VideoPlayer, frameRate: number) {
    super();
    this.widgetContainer = widgetContainer;
    this.player = player;
    this.frameRate = frameRate;

    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
  }

  private static async canvasToArrayBuffer (canvas: HTMLCanvasElement, mimeType: string) {
    const defer = new Deferred<ArrayBuffer>();
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.addEventListener("loadend", () => {
        defer.resolve(reader.result as ArrayBuffer);
      });
      reader.readAsArrayBuffer(blob);
    }, mimeType);
    return defer;
  }

  public async render (): Promise<boolean> {
    this.isCancelled = false;
    this.player.video.pause();
    const defer = new Deferred<boolean>();

    const onSeek = async () => {
      if (this.isCancelled) {
        defer.resolve(false);
        return;
      }
      const width = this.player.video.videoWidth;
      const height = this.player.video.videoHeight;
      this.canvas.width = width;
      this.canvas.height = height;
      const canvasWithoutVideo = await html2canvas(this.widgetContainer, {
        backgroundColor: "rgba(0,0,0,0)"
      });
      this.context.drawImage(this.player.video, 0, 0, width, height);
      this.context.drawImage(canvasWithoutVideo, 0, 0, width, height);
      const pngData = await Renderer.canvasToArrayBuffer(this.canvas, "image/png");
      const toSend = new RenderFrameEvent();
      toSend.pngData = pngData;
      toSend.progress = this.player.video.currentTime / this.player.video.duration;
      this.dispatchEvent(toSend);
      if (this.player.video.currentTime + this.frameRate > this.player.video.duration) {
        defer.resolve(true);
      } else {
        this.player.video.currentTime += this.frameRate;
      }
    };
    this.player.video.addEventListener("seeked", onSeek);
    this.player.video.currentTime = 0;
    const result = await defer;
    this.player.video.removeEventListener("seeked", onSeek);
    this.isCancelled = false;
    return result;
  }

  public cancel () {
    this.isCancelled = true;
  }
}
