import Scene from "scenejs";

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

export class Timeline {
  private scene: Scene;

  public tracks: Tracks = {};

  private time = 0;

  public constructor () {
    this.scene = new Scene(this.tracks, {
      easing: "linear",
      selector: true
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
