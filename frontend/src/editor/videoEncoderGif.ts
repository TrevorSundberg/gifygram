import {Deferred} from "../shared/shared";
import {FRAME_RATE} from "./utility";
import GifEncoder from "gif-encoder";
import {VideoEncoder} from "./videoEncoder";

export class VideoEncoderGif implements VideoEncoder {
  private context: CanvasRenderingContext2D;

  private canvas: HTMLCanvasElement;

  private encoder: GifEncoder;

  private chunks: Uint8Array[] = [];

  public async initialize (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.context = context;
    this.encoder = new GifEncoder(canvas.width, canvas.height);
    this.encoder.setFrameRate(FRAME_RATE);
    this.encoder.on("data", (data) => {
      this.chunks.push(data);
    });
    this.encoder.writeHeader();
  }

  public async stop () {
    this.encoder = null;
  }

  public async processFrame () {
    const {data} = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.encoder.addFrame(data);
  }

  public async getOutputVideo (): Promise<Blob> {
    const deferred = new Deferred<void>();
    this.encoder.once("end", () => {
      deferred.resolve();
    });
    this.encoder.finish();
    await deferred;
    return new Blob(this.chunks, {type: "image/gif"});
  }
}
