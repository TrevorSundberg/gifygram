import Scene from "scenejs";
import {Widget} from "./widget";

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

  private widgets: Record<string, Widget> = {};

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
    for (const widget of Object.values(this.widgets)) {
      widget.update();
    }
  }

  public createWidget (element: HTMLElement): Widget {
    if (this.tracks[element.id]) {
      throw new Error(`Element being used to create a widget must have a unique id: ${element.id}`);
    }
    const widget = new Widget(element);
    this.widgets[element.id] = widget;

    const track: Track = {};
    this.tracks[`#${element.id}`] = track;

    const onKeyframe = () => {
      track[this.scene.getTime()] = {
        transform: Widget.getTransformCss(widget.getTransform())
      };
      this.scene.set(this.tracks);
    };
    widget.addEventListener("keyframe", onKeyframe);

    const onDestroy = () => {
      delete this.widgets[widget.element.id];
      delete this.tracks[`#${element.id}`];
      widget.removeEventListener("keyframe", onKeyframe);
      widget.removeEventListener("destroy", onDestroy);
    };
    widget.addEventListener("destroy", onDestroy);

    return widget;
  }
}
