import {Deferred, Utility} from "./utility";
import {VideoSeeker, VideoSeekerFrame} from "./videoSeeker";
import {Timeline} from "./timeline";
import {VideoPlayer} from "./videoPlayer";

export class RenderFrameEvent extends Event {
  public pngData: ArrayBuffer;

  public progress: number;
}

export class Renderer extends VideoSeeker {
  private readonly widgetContainer: HTMLDivElement;

  private readonly timeline: Timeline;

  private readonly canvas = document.createElement("canvas")

  private readonly context: CanvasRenderingContext2D;

  public constructor (widgetContainer: HTMLDivElement, player: VideoPlayer, timeline: Timeline) {
    super(player);
    this.widgetContainer = widgetContainer;

    this.context = this.canvas.getContext("2d");
    this.timeline = timeline;
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
    const {video} = this.player;
    const width = video.videoWidth;
    const height = video.videoHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.clearRect(0, 0, width, height);

    this.timeline.setTime(frame.currentTime);
    for (const child of this.widgetContainer.childNodes) {
      if (child instanceof HTMLElement) {
        const transform = Utility.getTransform(child);
        this.context.translate(transform.translate[0], transform.translate[1]);
        this.context.rotate(transform.rotate * Math.PI / 180);
        this.context.scale(transform.scale[0], transform.scale[1]);
        if (child instanceof HTMLImageElement) {
          this.context.drawImage(child, -child.width / 2, -child.height / 2, child.width, child.height);
        } else if (child instanceof HTMLDivElement) {
          this.context.font = window.getComputedStyle(child).font;
          this.context.fillText(child.innerText, 0, 0);
        }
        this.context.resetTransform();
      }
    }

    const pngData = await Renderer.canvasToArrayBuffer(this.canvas, "image/png");
    const toSend = new RenderFrameEvent("frame");
    toSend.pngData = pngData;
    toSend.progress = frame.progress;
    this.dispatchEvent(toSend);
  }

  public async render (): Promise<boolean> {
    return this.run(0, false);
  }
}
