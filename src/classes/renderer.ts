import {VideoPlayer} from "./videoPlayer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2canvas: typeof import("html2canvas").default = require("html2canvas");

export class RenderFrameEvent extends Event {
  public pngData: ArrayBuffer;

  public constructor (type: string, pngData: ArrayBuffer) {
    super(type);
    this.pngData = pngData;
  }
}

export class Renderer extends EventTarget {
  private widgetContainer: HTMLDivElement;

  private player: VideoPlayer;

  private frameRate: number;

  private canvas: HTMLCanvasElement;

  private context: CanvasRenderingContext2D;

  public constructor (widgetContainer: HTMLDivElement, player: VideoPlayer, frameRate: number) {
    super();
    this.widgetContainer = widgetContainer;
    this.player = player;
    this.frameRate = frameRate;

    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
  }

  private static async canvasToArrayBuffer (canvas: HTMLCanvasElement, mimeType: string) {
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
  }

  public async render () {
    this.player.video.pause();
    let resolver: (value?: unknown) => void = null;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });

    const onSeek = async () => {
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
      this.dispatchEvent(new RenderFrameEvent("frame", pngData));
      if (this.player.video.currentTime + this.frameRate > this.player.video.duration) {
        resolver();
      } else {
        this.player.video.currentTime += this.frameRate;
      }
    };
    this.player.video.addEventListener("seeked", onSeek);
    this.player.video.currentTime = 0;
    await promise;
    this.player.video.removeEventListener("seeked", onSeek);
  }
}
