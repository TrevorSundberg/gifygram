import Scene, {Frame} from "scenejs";

export interface Keyframe {
  transform: string;
  visibility: "hidden" | "visible";
}

export interface Track {
  [time: number]: Keyframe;
}

export interface Tracks {
  [selector: string]: Track;
}

export class TimelineEvent extends Event {
  public readonly frame: Frame;

  public constructor (type: string, frame: Frame) {
    super(type);
    this.frame = frame;
  }
}

export class Timeline {
  private scene: Scene;

  public tracks: Tracks = {};

  private time = 0;

  public constructor () {
    this.scene = new Scene(this.tracks, {
      easing: "linear",
      selector: true
    });
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

  public getTime () {
    return this.time;
  }

  public setTime (time: number) {
    if (this.time !== time) {
      this.scene.setTime(time);
      this.time = time;
    }
  }

  public updateTracks () {
    this.scene.set(this.tracks);
  }
}
