import {VideoSeeker, VideoSeekerEvent} from "./videoSeeker";
import {Deferred} from "./utility";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2canvas: typeof import("html2canvas").default = require("html2canvas");

export class RenderFrameEvent extends Event {
  public pngData: ArrayBuffer;

  public progress: number;
}

export class Renderer extends EventTarget {
  private readonly widgetContainer: HTMLDivElement;

  private readonly seeker: VideoSeeker;

  private readonly canvas = document.createElement("canvas")

  private readonly context: CanvasRenderingContext2D;

  public constructor (widgetContainer: HTMLDivElement, seeker: VideoSeeker) {
    super();
    this.widgetContainer = widgetContainer;
    this.seeker = seeker;

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
    const onFrame = async (event: VideoSeekerEvent) => {
      const {video} = this.seeker.player;
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
      toSend.progress = event.progress;
      this.dispatchEvent(toSend);
    };
    this.seeker.addEventListener("frame", onFrame);
    const result = await this.seeker.run(0);
    this.seeker.removeEventListener("frame", onFrame);
    return result;
  }

  public async cancel () {
    await this.seeker.stop();
  }
}
