import {Deferred, FRAME_RATE} from "./utility";
import GifEncoder from "gif-encoder";
import {VideoEncoder} from "./videoEncoder";

export class VideoEncoderGif implements VideoEncoder {
  private context: CanvasRenderingContext2D;

  private canvas: HTMLCanvasElement;

  private gif: GifEncoder;

  private chunks: Uint8Array[] = [];

  public async initialize (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.context = context;
    this.gif = new GifEncoder(canvas.width, canvas.height);
    this.gif.setFrameRate(FRAME_RATE);
    this.gif.on("data", (data) => {
      this.chunks.push(data);
    });
    this.gif.writeHeader();
  }

  public async stop () {
    this.gif = null;
  }

  public async processFrame () {
    const {data} = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.gif.addFrame(data);
  }

  public async getOutputVideo (): Promise<Blob> {
    const deferred = new Deferred<void>();
    this.gif.once("end", () => {
      deferred.resolve();
    });
    this.gif.finish();
    await deferred;
    return new Blob(this.chunks, {type: "image/gif"});
  }
}
