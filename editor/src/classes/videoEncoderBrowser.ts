import {Deferred, FRAME_RATE} from "./utility";
import {VideoEncoder} from "./videoEncoder";

export class VideoEncoderBrowser implements VideoEncoder {
  private stream: MediaStream;

  private recorder: MediaRecorder;

  private chunks: Blob[] = [];

  private gotLastData: Deferred<void>;

  public async initialize (canvas: HTMLCanvasElement) {
    this.stream = (canvas as any).captureStream(FRAME_RATE) as MediaStream;
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (event) => {
      this.chunks.push(event.data);
      if (this.gotLastData) {
        this.gotLastData.resolve();
      }
    };
    this.recorder.start();
  }

  public async stop () {
    this.recorder.stop();
  }

  public async processFrame () {
    const [videoTrack] = this.stream.getVideoTracks();
    (videoTrack as any).requestFrame();
  }

  public async getOutputVideo () {
    this.gotLastData = new Deferred<void>();
    this.stop();
    await this.gotLastData;
    const output = new Blob(this.chunks, {type: this.recorder.mimeType});
    this.chunks.length = 0;
    return output;
  }
}
