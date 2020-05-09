import {FRAME_RATE} from "./utility";
import {VideoEncoder} from "./videoEncoder";
import Whammy from "whammy";

export class VideoEncoderWebm implements VideoEncoder {
  private canvas: HTMLCanvasElement;

  private encoder: Whammy.Video;

  public async initialize (canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.encoder = new Whammy.Video(FRAME_RATE);
  }

  public async stop () {
    this.encoder = null;
  }

  public async processFrame () {
    this.encoder.add(this.canvas);
  }

  public async getOutputVideo (): Promise<Blob> {
    return this.encoder.compile();
  }
}
