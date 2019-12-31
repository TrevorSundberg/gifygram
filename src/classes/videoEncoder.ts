interface FfmpegWorker {
  load();
  write(filename: string, buffer: Uint8Array);
  read(filename: string);
  run(command: string, {output: string});
}

export class VideoEncoder {
  private workerPromise: Promise<FfmpegWorker>;

  private frame = 0;

  public constructor () {
    this.workerPromise = (async () => {
      const {createWorker} = await import("@ffmpeg/ffmpeg");
      const worker: FfmpegWorker = createWorker({
        logger: (message) => console.log(message)
      });
      await worker.load();
      return worker;
    })();
  }

  public reset () {
    this.frame = 0;
  }

  public async addFrame (pngData: ArrayBuffer) {
    const worker = await this.workerPromise;
    await worker.write(`frame${this.frame}.png`, new Uint8Array(pngData));
    ++this.frame;
  }

  public async encode () {
    const worker = await this.workerPromise;
    await worker.run("-i /data/frame%d.png output.mp4", {
      output: "output.mp4"
    });
    const output = (await worker.read("output.mp4")).data;
    return new Blob([output], {
      type: "video/mp4"
    });
  }
}
