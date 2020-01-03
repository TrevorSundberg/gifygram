import {Deferred} from "./utility";
import {VideoPlayer} from "./videoPlayer";

export class VideoSeekerEvent extends Event {
  public progress: number;
}

export class VideoSeeker extends EventTarget {
  public readonly player: VideoPlayer;

  private readonly frameRate: number;

  private runningPromise: Deferred<void> = null;

  private isStopped = false;

  public constructor (player: VideoPlayer, frameRate: number) {
    super();
    this.player = player;
    this.frameRate = frameRate;
  }

  public async run (startTime: number): Promise<boolean> {
    this.runningPromise = new Deferred<void>();
    this.player.video.pause();
    const defer = new Deferred<boolean>();

    const onSeek = async () => {
      if (this.isStopped) {
        defer.resolve(false);
        return;
      }
      const toSend = new VideoSeekerEvent("frame");
      toSend.progress = this.player.video.currentTime / this.player.video.duration;
      this.dispatchEvent(toSend);
      if (this.player.video.currentTime + this.frameRate > this.player.video.duration) {
        defer.resolve(true);
      } else {
        this.player.video.currentTime += this.frameRate;
      }
    };
    this.player.video.addEventListener("seeked", onSeek);
    this.player.video.currentTime = startTime;
    const result = await defer;
    this.player.video.removeEventListener("seeked", onSeek);
    this.runningPromise = null;
    this.isStopped = false;
    return result;
  }

  public async stop () {
    if (this.runningPromise) {
      this.isStopped = true;
      await this.runningPromise;
    }
  }
}
