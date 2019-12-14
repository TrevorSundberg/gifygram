import {Gizmo} from "./gizmo";
import Scene from "scenejs";

interface Keyframe {
  transform: string;
}

interface Track {
  [time: number]: Keyframe;
}

interface Tracks {
  [selector: string]: Track;
}

export class Timeline {
  private video: HTMLVideoElement;

  private lastTime = -1;

  private scene: Scene;

  private tracks: Tracks = {};

  private elements: Record<string, HTMLElement> = {};

  private selection: Gizmo = null;

  public constructor (video: HTMLVideoElement) {
    this.video = video;
    this.scene = new Scene(this.tracks, {
      easing: "linear",
      selector: true
    });
    this.scene.setDuration(Number.MAX_VALUE);
    this.update();
  }

  private update () {
    requestAnimationFrame(() => {
      this.update();
    });
    const {currentTime} = this.video;
    if (this.lastTime !== currentTime) {
      this.lastTime = currentTime;
      this.scene.setTime(currentTime);
    }
    if (this.selection) {
      this.selection.update();
    }
  }

  public addElement (element: HTMLElement) {
    if (this.elements[element.id]) {
      throw new Error(`Element already tracked by timeline: ${element.id}`);
    }
    this.elements[element.id] = element;

    const track: Track = {};
    this.tracks[`#${element.id}`] = track;
  }

  public destroyElement (element: HTMLElement) {
    if (!this.elements[element.id]) {
      throw new Error(`Element not tracked by timeline: ${element.id}`);
    }
    delete this.elements[element.id];
    delete this.tracks[`#${element.id}`];
    this.scene.set(this.tracks);
  }

  private onSelectionKeyframe () {
    const {element} = this.selection;
    const track = this.tracks[`#${element.id}`];
    track[this.video.currentTime] = {
      transform: Gizmo.getTransformCss(this.selection.getTransform())
    };
    this.scene.set(this.tracks);
  }

  public selectElement (element: HTMLElement) {
    if (!this.elements[element.id]) {
      throw new Error(`Element not tracked by timeline: ${element.id}`);
    }
    if (this.selection) {
      this.selection.destroy();
    }
    this.selection = new Gizmo(element);
    this.selection.addEventListener("keyframe", () => this.onSelectionKeyframe());
  }
}
