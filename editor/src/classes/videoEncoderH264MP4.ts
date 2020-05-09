import {FRAME_RATE} from "./utility";
import {VideoEncoder} from "./videoEncoder";

const makeEven = (value: number) => value - value % 2;

export class VideoEncoderH264MP4 implements VideoEncoder {
  private context: CanvasRenderingContext2D;

  private encoder: import("h264-mp4-encoder").H264MP4Encoder;

  public async initialize (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    const HME = await import("h264-mp4-encoder");
    this.context = context;

    this.encoder = await HME.createH264MP4Encoder();
    this.encoder.frameRate = FRAME_RATE;
    this.encoder.width = makeEven(canvas.width);
    this.encoder.height = makeEven(canvas.height);

    this.encoder.initialize();
  }

  public async stop () {
    if (this.encoder) {
      this.encoder.finalize();
      this.encoder.delete();
      this.encoder = null;
    }
  }

  public async processFrame () {
    const {data} = this.context.getImageData(0, 0, this.encoder.width, this.encoder.height);
    this.encoder.addFrameRgba(data);
  }

  public async getOutputVideo (): Promise<Blob> {
    this.encoder.finalize();
    const buffer = this.encoder.FS.readFile(this.encoder.outputFilename);
    this.encoder.FS.unlink(this.encoder.outputFilename);
    this.encoder.delete();
    this.encoder = null;
    return new Blob([buffer], {type: "video/mp4"});
  }
}
