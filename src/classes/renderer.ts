import {Deferred} from "./utility";
import {VideoPlayer} from "./videoPlayer";
import {VideoSeeker} from "./videoSeeker";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2canvas: typeof import("html2canvas").default = require("html2canvas");

export class RenderFrameEvent extends Event {
  public pngData: ArrayBuffer;

  public progress: number;
}

export class Renderer extends VideoSeeker {
  private readonly widgetContainer: HTMLDivElement;

  private readonly canvas = document.createElement("canvas")

  private readonly context: CanvasRenderingContext2D;

  public constructor (widgetContainer: HTMLDivElement, player: VideoPlayer) {
    super(player);
    this.widgetContainer = widgetContainer;

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

  protected async onFrame (progress: number) {
    const {video} = this.player;
    const width = video.videoWidth;
    const height = video.videoHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    // Only using widgetContainer is incorrect due to parent transform (can't use display: none here either).
    const clone = this.widgetContainer.cloneNode(true) as HTMLDivElement;
    clone.style.position = "relative";
    clone.style.top = `${window.innerHeight}px`;
    clone.style.left = "0px";
    document.body.append(clone);
    const canvasWithoutVideo = await html2canvas(clone, {
      backgroundColor: "rgba(0,0,0,0)",
      height,
      logging: false,
      width,
      windowHeight: height,
      windowWidth: width
    });
    clone.remove();
    this.context.drawImage(video, 0, 0, width, height);
    this.context.drawImage(canvasWithoutVideo, 0, 0, width, height);
    const pngData = await Renderer.canvasToArrayBuffer(this.canvas, "image/png");
    const toSend = new RenderFrameEvent("frame");
    toSend.pngData = pngData;
    toSend.progress = progress;
    this.dispatchEvent(toSend);
  }

  public async render (): Promise<boolean> {
    return this.run(0);
  }
}
