import {Deferred, Utility} from "./utility";
import {VideoSeeker, VideoSeekerFrame} from "./videoSeeker";
import {Image} from "./image";
import {Timeline} from "./timeline";
import {VideoPlayer} from "./videoPlayer";

export class RenderFrameEvent extends Event {
  public pngData: ArrayBuffer;

  public progress: number;
}

export class Renderer extends VideoSeeker {
  private readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;

  private readonly resizeCanvas: HTMLCanvasElement;

  private readonly resizeContext: CanvasRenderingContext2D;

  private readonly widgetContainer: HTMLDivElement;

  private readonly timeline: Timeline;


  public constructor (
    canvas: HTMLCanvasElement,
    widgetContainer: HTMLDivElement,
    player: VideoPlayer,
    timeline: Timeline
  ) {
    super(player);
    this.canvas = canvas;
    this.context = this.canvas.getContext("2d");
    this.widgetContainer = widgetContainer;

    this.resizeCanvas = document.createElement("canvas");
    this.resizeContext = this.resizeCanvas.getContext("2d");

    this.timeline = timeline;
  }

  public drawFrame (currentTime: number, finalRender: boolean) {
    const size = this.player.getAspectSize();
    [
      this.canvas.width,
      this.canvas.height
    ] = size;
    this.context.clearRect(0, 0, size[0], size[1]);

    for (const child of this.widgetContainer.childNodes) {
      if (child instanceof HTMLImageElement) {
        const hidden = child.style.clip !== "auto";
        if (hidden && finalRender) {
          continue;
        }
        const transform = Utility.getTransform(child);
        this.context.translate(transform.translate[0], transform.translate[1]);
        this.context.rotate(transform.rotate * Math.PI / 180);
        this.context.scale(transform.scale[0], transform.scale[1]);
        const bitmap = Image.getImage(child).getFrameAtTime(currentTime);
        this.context.globalAlpha = hidden ? 0.3 : 1;
        this.context.drawImage(bitmap, -child.width / 2, -child.height / 2, child.width, child.height);
        this.context.resetTransform();
      }
    }
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

  protected async onFrame (frame: VideoSeekerFrame) {
    this.timeline.setTime(frame.currentTime);
    this.drawFrame(frame.currentTime, true);
    const size = this.player.getRawSize();
    [
      this.resizeCanvas.width,
      this.resizeCanvas.height
    ] = size;
    this.resizeContext.drawImage(this.canvas, 0, 0, size[0], size[1]);
    const pngData = await Renderer.canvasToArrayBuffer(this.resizeCanvas, "image/png");
    const toSend = new RenderFrameEvent("frame");
    toSend.pngData = pngData;
    toSend.progress = frame.progress;
    this.dispatchEvent(toSend);
  }

  public async render (): Promise<boolean> {
    return this.run(0, false);
  }
}
