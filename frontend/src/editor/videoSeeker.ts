import {Deferred} from "../shared/shared";
import {FRAME_TIME} from "./utility";
import {VideoPlayer} from "./videoPlayer";

export class VideoSeekerFrame {
  public normalizedCurrentTime: number;

  public currentTime: number;

  public progress: number;
}

export abstract class VideoSeeker {
  public readonly player: VideoPlayer;

  private runningPromise: Deferred<boolean> = null;

  private isStopped = false;

  public constructor (player: VideoPlayer) {
    this.player = player;
  }

  public snapToFrameRate (time: number) {
    return Math.round(time / FRAME_TIME) * FRAME_TIME;
  }

  protected async run (startTime: number): Promise<boolean> {
    this.runningPromise = new Deferred<boolean>();
    await this.player.loadPromise;
    const {video} = this.player;
    video.pause();

    const frame = new VideoSeekerFrame();
    frame.currentTime = this.snapToFrameRate(startTime);
    frame.normalizedCurrentTime = frame.currentTime / video.duration;

    const onSeek = async () => {
      if (this.isStopped) {
        this.runningPromise.resolve(false);
      }
      frame.progress = frame.currentTime / video.duration;
      await this.onFrame(frame);
      if (frame.currentTime + FRAME_TIME > video.duration) {
        this.runningPromise.resolve(true);
      }
      frame.currentTime = this.snapToFrameRate(frame.currentTime + FRAME_TIME);
      frame.normalizedCurrentTime = frame.currentTime / video.duration;

      video.currentTime = frame.currentTime;
    };

    video.addEventListener("seeked", onSeek);
    video.currentTime = frame.currentTime;

    const result = await this.runningPromise;

    video.removeEventListener("seeked", onSeek);

    this.runningPromise = null;
    this.isStopped = false;
    return result;
  }

  protected abstract async onFrame (frame: VideoSeekerFrame);

  public async stop () {
    if (this.runningPromise) {
      this.isStopped = true;
      await this.runningPromise;
    }
  }
}
