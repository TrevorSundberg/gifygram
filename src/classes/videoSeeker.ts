import {Deferred, FRAME_TIME} from "./utility";
import {VideoPlayer} from "./videoPlayer";

export class VideoSeekerFrame {
  public currentTime: number;

  public progress: number;
}

export class VideoSeeker extends EventTarget {
  public readonly player: VideoPlayer;

  private runningPromise: Deferred<boolean> = null;

  private isStopped = false;

  public constructor (player: VideoPlayer) {
    super();
    this.player = player;
  }

  public snapToFrameRate (time: number) {
    return Math.round(time / FRAME_TIME) * FRAME_TIME;
  }

  protected async run (startTime: number, seekVideo: boolean): Promise<boolean> {
    this.runningPromise = new Deferred<boolean>();
    await this.player.loadPromise;
    const {video} = this.player;
    video.pause();

    const frame = new VideoSeekerFrame();
    frame.currentTime = this.snapToFrameRate(startTime);

    const onSeek = async () => {
      if (this.isStopped) {
        this.runningPromise.resolve(false);
        return false;
      }
      frame.progress = frame.currentTime / video.duration;
      await this.onFrame(frame);
      if (frame.currentTime + FRAME_TIME > video.duration) {
        this.runningPromise.resolve(true);
        return false;
      }
      frame.currentTime = this.snapToFrameRate(frame.currentTime + FRAME_TIME);

      if (seekVideo) {
        video.currentTime = frame.currentTime;
      }
      return true;
    };

    if (seekVideo) {
      video.addEventListener("seeked", onSeek);
      video.currentTime = frame.currentTime;
    } else {
      // eslint-disable-next-line curly
      while (await onSeek());
    }

    const result = await this.runningPromise;

    if (seekVideo) {
      video.removeEventListener("seeked", onSeek);
    }

    this.runningPromise = null;
    this.isStopped = false;
    return result;
  }

  protected async onFrame (frame: VideoSeekerFrame) {
    throw new Error(`Not implemented (${frame})`);
  }

  public async stop () {
    if (this.runningPromise) {
      this.isStopped = true;
      await this.runningPromise;
    }
  }
}
