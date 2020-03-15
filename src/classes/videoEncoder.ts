import {FRAME_RATE} from "./utility";
import {VideoPlayer} from "./videoPlayer";

interface FfmpegWorker {
  load();
  write(filename: string, buffer: Uint8Array);
  read(filename: string);
  run(command: string, {output: string});
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

  public constructor () {
    super();
    this.workerPromise = (async () => {
      // eslint-disable-next-line capitalized-comments, no-inline-comments
      const {createWorker} = await import(/* webpackChunkName: "ffmpeg" */ "@ffmpeg/ffmpeg");
      const worker: FfmpegWorker = createWorker({
        corePath: require("@ffmpeg/core/ffmpeg-core.js").default,
        logger: (info) => console.log(info.message),
        progress: (progress: FfmpegProgress) => {
          const toSend = new VideoProgressEvent("progress");
          toSend.progress = progress.ratio;
          this.dispatchEvent(toSend);
        },
        workerPath: require("@ffmpeg/ffmpeg/dist/worker.min.js").default
      });
      await worker.load();
      return worker;
    })();
  }

  public async addVideo (video: VideoPlayer) {
    const response = await fetch(video.getAttributedSrc().src);
    const videoData = await response.arrayBuffer();
    const result = this.chain.then(async () => {
      const worker = await this.workerPromise;
      await worker.write("background.mp4", new Uint8Array(videoData));
    });
    this.chain = result;
  }

  public async addFrame (pngData: ArrayBuffer) {
    const result = this.chain.then(async () => {
      const worker = await this.workerPromise;
      await worker.write(`frame${this.frame}.png`, new Uint8Array(pngData));
      return this.frame++;
    });
    this.chain = result;
    return result;
  }

  public async encode () {
    const result = this.chain.then(async () => {
      this.frame = 0;
      const worker = await this.workerPromise;
      await worker.run(`-i /data/background.mp4 -framerate ${FRAME_RATE} -i /data/frame%d.png output.mp4 ` +
        "-filter_complex [0:v][1:v]overlay=0:0", {
        output: "output.mp4"
      });
      const output = (await worker.read("output.mp4")).data;
      return new Blob([output], {
        type: "video/mp4"
      });
    });
    this.chain = result;
    return result;
  }
}
