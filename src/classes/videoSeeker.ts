import {Deferred} from "./utility";
import {VideoPlayer} from "./videoPlayer";

export class VideoSeeker extends EventTarget {
  public readonly player: VideoPlayer;

  private readonly frameRate: number;

  private runningPromise: Deferred<boolean> = null;

  private isStopped = false;

  public constructor (player: VideoPlayer, frameRate: number = 1 / 30) {
    super();
    this.player = player;
    this.frameRate = frameRate;
  }

  protected async run (startTime: number): Promise<boolean> {
    this.runningPromise = new Deferred<boolean>();
    await this.player.loadPromise;
    this.player.video.pause();

    const onSeek = async () => {
      if (this.isStopped) {
        this.runningPromise.resolve(false);
        return;
      }
      await this.onFrame(this.player.video.currentTime / this.player.video.duration);
      if (this.player.video.currentTime + this.frameRate > this.player.video.duration) {
        this.runningPromise.resolve(true);
      } else {
        this.player.video.currentTime += this.frameRate;
      }
    };
    this.player.video.addEventListener("seeked", onSeek);
    this.player.video.currentTime = startTime;
    const result = await this.runningPromise;
    this.player.video.removeEventListener("seeked", onSeek);
    this.runningPromise = null;
    this.isStopped = false;
    return result;
  }

  protected async onFrame (progress: number) {
    throw new Error(`Not implemented (${progress})`);
  }

  public async stop () {
    if (this.runningPromise) {
      this.isStopped = true;
      await this.runningPromise;
    }
  }
}
