import {DURATION_PER_ENCODE, Deferred, FRAME_RATE, canvasToArrayBuffer} from "./utility";
import {VideoEncoder, VideoEncoderProgressCallback} from "./videoEncoder";
import {VideoPlayer} from "./videoPlayer";

interface FfmpegWorker {
  load();
  write(filename: string, buffer: Uint8Array);
  read(filename: string);
  run(command: string);
  concatDemuxer(inputs: string[], output: string, args?: string);
  terminate();
}

export class VideoEncoderFfmpeg implements VideoEncoder {
  private canvas: HTMLCanvasElement;

  private onEncoderProgress: VideoEncoderProgressCallback;

  private worker: FfmpegWorker;

  private frame = 0;

  private cancel = new Deferred<"cancel">();

  private duration: number;

  private progressMajorTime = 0;

  private progressMinorTime = 0;

  public async initialize (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    video: VideoPlayer,
    onEncoderProgress: VideoEncoderProgressCallback
  ) {
    this.canvas = canvas;
    this.onEncoderProgress = onEncoderProgress;
    // eslint-disable-next-line capitalized-comments, no-inline-comments
    const {createWorker} = await import(/* webpackChunkName: "ffmpeg" */ "@ffmpeg/ffmpeg");
    this.worker = createWorker({
      corePath: require("@ffmpeg/core/ffmpeg-core.js").default,
      logger: (info) => {
        const msg: string = info.message;
        const match = (/frame=\s*([0-9]+)/gu).exec(msg);
        if (match) {
          this.progressMinorTime = parseInt(match[1], 10) / FRAME_RATE;
          this.encoderProgressChanged();
        }
        console.log(msg);
      },
      workerPath: require("@ffmpeg/ffmpeg/dist/worker.min.js").default
    });
    await this.worker.load();

    await video.loadPromise;
    this.duration = video.video.duration;
    const response = await fetch(video.getAttributedSrc().src);
    const videoData = await response.arrayBuffer();
    await this.worker.write("background.mp4", new Uint8Array(videoData));
  }

  public async processFrame () {
    const pngData: ArrayBuffer = await canvasToArrayBuffer(this.canvas, "image/png");
    const frame = this.frame++;
    if (this.worker) {
      await this.worker.write(`frame${frame}.png`, new Uint8Array(pngData));
    }
  }

  public async stop () {
    const {worker} = this;
    this.worker = null;
    this.cancel.resolve("cancel");
    await worker.terminate();
  }

  private encoderProgressChanged () {
    const progress = (this.progressMajorTime + this.progressMinorTime) / this.duration;
    this.onEncoderProgress(progress);
  }

  public async getOutputVideo () {
    this.frame = 0;
    if (this.worker) {
      const outputs: string[] = [];
      for (let time = 0; time < this.duration; time += DURATION_PER_ENCODE) {
        this.progressMajorTime = time;
        this.progressMinorTime = 0;
        this.encoderProgressChanged();

        const output = `/${outputs.length}.mp4`;
        outputs.push(output);
        const command =
            "-i /data/background.mp4 " +
            `-framerate ${FRAME_RATE} ` +
            "-i /data/frame%d.png " +
            "-an " +
            "-preset ultrafast " +
            `-ss ${time} ` +
            `-t ${DURATION_PER_ENCODE} ` +
            `${output} ` +
            "-filter_complex [0:v][1:v]overlay=0:0";
        console.log(command);
        const promise: Promise<undefined> = this.worker.run(command);
        const cancelled = await Promise.race([
          this.cancel,
          promise
        ]);
        if (cancelled === "cancel") {
          return null;
        }
      }
      await this.worker.concatDemuxer(outputs, "output.mp4");
      const output = (await this.worker.read("output.mp4")).data;
      return new Blob([output], {
        type: "video/mp4"
      });
    }
    return null;
  }
}
