import {DURATION_PER_ENCODE, Deferred, FRAME_RATE} from "./utility";
import {VideoPlayer} from "./videoPlayer";

interface FfmpegWorker {
  load();
  write(filename: string, buffer: Uint8Array);
  read(filename: string);
  run(command: string);
  concatDemuxer(inputs: string[], output: string, args?: string);
  terminate();
}

interface FfmpegProgress {
  ratio: number;
}

export class VideoProgressEvent extends Event {
  public progress: number;
}

export class VideoEncoder extends EventTarget {
  private workerPromise: Promise<FfmpegWorker>;

  private frame = 0;

  private chain = Promise.resolve<any>(null);

  private cancel = new Deferred<"cancel">();

  private duration: number;

  private progressMajorTime = 0;

  private progressMinorTime = 0;

  public constructor () {
    super();
    this.workerPromise = (async () => {
      // eslint-disable-next-line capitalized-comments, no-inline-comments
      const {createWorker} = await import(/* webpackChunkName: "ffmpeg" */ "@ffmpeg/ffmpeg");
      const worker: FfmpegWorker = createWorker({
        corePath: require("@ffmpeg/core/ffmpeg-core.js").default,
        logger: (info) => {
          const msg: string = info.message;
          const match = (/frame=\s*([0-9]+)/gu).exec(msg);
          if (match) {
            this.progressMinorTime = parseInt(match[1], 10) / FRAME_RATE;
            this.progressChanged();
          }
          console.log(msg);
        },
        workerPath: require("@ffmpeg/ffmpeg/dist/worker.min.js").default
      });
      await worker.load();
      return worker;
    })();
  }

  public async addVideo (video: VideoPlayer) {
    await video.loadPromise;
    this.duration = video.video.duration;
    const response = await fetch(video.getAttributedSrc().src);
    const videoData = await response.arrayBuffer();
    const result = this.chain.then(async () => {
      const worker = await this.workerPromise;
      if (worker) {
        await worker.write("background.mp4", new Uint8Array(videoData));
      }
    });
    this.chain = result;
  }

  public async addFrame (pngData: ArrayBuffer) {
    const result = this.chain.then(async () => {
      const frame = this.frame++;
      const worker = await this.workerPromise;
      if (worker) {
        await worker.write(`frame${frame}.png`, new Uint8Array(pngData));
      }
      return frame;
    });
    this.chain = result;
    return result;
  }

  public async stop () {
    const worker = await this.workerPromise;
    this.workerPromise = null;
    this.cancel.resolve("cancel");
    await worker.terminate();
  }

  private progressChanged () {
    const toSend = new VideoProgressEvent("progress");
    toSend.progress = (this.progressMajorTime + this.progressMinorTime) / this.duration;
    this.dispatchEvent(toSend);
  }

  public async encode () {
    const result = this.chain.then(async () => {
      this.frame = 0;
      const worker = await this.workerPromise;
      if (worker) {
        const outputs: string[] = [];
        for (let time = 0; time < this.duration; time += DURATION_PER_ENCODE) {
          this.progressMajorTime = time;
          this.progressMinorTime = 0;
          this.progressChanged();

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
          const promise: Promise<undefined> = worker.run(command);
          const cancelled = await Promise.race([
            this.cancel,
            promise
          ]);
          if (cancelled === "cancel") {
            return null;
          }
        }
        await worker.concatDemuxer(outputs, "output.mp4");
        const output = (await worker.read("output.mp4")).data;
        return new Blob([output], {
          type: "video/mp4"
        });
      }
      return null;
    });
    this.chain = result;
    return result;
  }
}
