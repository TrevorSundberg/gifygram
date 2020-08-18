import Scene, {Frame} from "scenejs";
import {Tracks} from "../../../common/common";

export class TimelineEvent extends Event {
  public readonly frame: Frame;

  public constructor (type: string, frame: Frame) {
    super(type);
    this.frame = frame;
  }
}

export class Timeline {
  private scene: Scene;

  private normalizedTime = 0;

  public constructor () {
    this.updateTracks({});
    this.scene.on("animate", (event) => {
      // eslint-disable-next-line guard-for-in
      for (const selector in event.frames) {
        const frame: Frame = event.frames[selector];
        const element = document.querySelector(selector);
        if (element) {
          element.dispatchEvent(new TimelineEvent("frame", frame));
        }
      }
    });
  }

  public getNormalizedTime () {
    return this.normalizedTime;
  }

  public setNormalizedTime (normalizedTime: number) {
    if (this.normalizedTime !== normalizedTime) {
      this.scene.setTime(normalizedTime);
      this.normalizedTime = normalizedTime;
    }
  }

  public updateTracks (tracks: Tracks) {
    this.scene = new Scene(tracks, {
      easing: "linear",
      selector: true
    });
    this.scene.setTime(this.normalizedTime);
  }
}
