import Scene, {Frame} from "scenejs";

export interface Keyframe {
  transform: string;
  active: boolean;
}

export interface Track {
  [time: number]: Keyframe;
}

export interface Tracks {
  [selector: string]: Track;
}

export class Timeline {
  private scene: Scene;

  public readonly tracks: Tracks = {};

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
        const active = frame.get("active") || false;
        const element = document.querySelector(selector);
        element.dispatchEvent(new Event(active ? "activate" : "deactivate"));
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
