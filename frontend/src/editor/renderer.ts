import {MAX_OUTPUT_SIZE, Utility, resizeMinimumKeepAspect} from "./utility";
import {VideoSeeker, VideoSeekerFrame} from "./videoSeeker";
import {Image} from "./image";
import {Timeline} from "./timeline";
import {VideoPlayer} from "./videoPlayer";

export class RenderFrameEvent {
  public progress: number;
}

export class Renderer extends VideoSeeker {
  private readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;

  public readonly resizeCanvas: HTMLCanvasElement;

  public readonly resizeContext: CanvasRenderingContext2D;

  private readonly widgetContainer: HTMLDivElement;

  private readonly timeline: Timeline;

  public onRenderFrame: (event: RenderFrameEvent) => Promise<void>;

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

    player.addEventListener("srcChanged", () => this.updateResizeCanvsaSize());
    this.updateResizeCanvsaSize();
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

  private updateResizeCanvsaSize () {
    const size = resizeMinimumKeepAspect(this.player.getRawSize(), MAX_OUTPUT_SIZE);
    [
      this.resizeCanvas.width,
      this.resizeCanvas.height
    ] = size;
  }

  protected async onFrame (frame: VideoSeekerFrame) {
    this.timeline.setNormalizedTime(frame.normalizedCurrentTime);
    this.updateResizeCanvsaSize();
    this.drawFrame(frame.currentTime, true);
    this.resizeContext.drawImage(this.player.video, 0, 0, this.resizeCanvas.width, this.resizeCanvas.height);
    this.resizeContext.drawImage(this.canvas, 0, 0, this.resizeCanvas.width, this.resizeCanvas.height);
    const toSend = new RenderFrameEvent();
    toSend.progress = frame.progress;
    await this.onRenderFrame(toSend);
  }

  public async render (): Promise<boolean> {
    return this.run(0);
  }
}
