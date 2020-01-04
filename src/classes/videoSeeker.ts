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

  public snapToFrameRate (time: number) {
    return Math.round(time / this.frameRate) * this.frameRate;
  }

  protected async run (startTime: number): Promise<boolean> {
    this.runningPromise = new Deferred<boolean>();
    await this.player.loadPromise;
    const {video} = this.player;
    video.pause();

    const onSeek = async () => {
      if (this.isStopped) {
        this.runningPromise.resolve(false);
        return;
      }
      await this.onFrame(video.currentTime / video.duration);
      if (video.currentTime + this.frameRate > video.duration) {
        this.runningPromise.resolve(true);
      } else {
        video.currentTime = this.snapToFrameRate(video.currentTime + this.frameRate);
      }
    };
    video.addEventListener("seeked", onSeek);
    video.currentTime = this.snapToFrameRate(startTime);
    const result = await this.runningPromise;
    video.removeEventListener("seeked", onSeek);
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
