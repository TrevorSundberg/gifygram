// eslint-disable-next-line max-classes-per-file
import {Gizmo} from "./gizmo";
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

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export class Timeline {
  private video: HTMLVideoElement;

  private lastTime = -1;

  private scene: Scene;

  private tracks: Tracks = {};

  private elements: Record<string, HTMLElement> = {};

  private selection: Gizmo = null;

  private idCounter = 0;

  public constructor (video: HTMLVideoElement) {
    this.video = video;
    this.scene = new Scene(this.tracks, {
      easing: "linear",
      selector: true
    });
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

  private static finalizeElement (id: string, element: HTMLElement) {
    element.id = id;
    element.style.position = "absolute";
    document.body.appendChild(element);
  }

  public static createImage (src: string): ElementFactory {
    return async (id: string) => {
      const element = document.createElement("img");
      element.src = src;
      await new Promise((resolve) => {
        element.onload = resolve;
      });
      Timeline.finalizeElement(id, element);
      return element;
    };
  }

  public static createText (): ElementFactory {
    return async (id: string) => {
      const element = document.createElement("input");
      element.type = "text";
      document.body.appendChild(element);
      Timeline.finalizeElement(id, element);
      return element;
    };
  }

  public async addWidget (createElement: ElementFactory): Promise<Widget> {
    const id = `id${this.idCounter++}`;
    const element = await createElement(id);

    if (this.elements[id]) {
      throw new Error(`Element already tracked by timeline: ${id}`);
    }
    this.elements[id] = element;

    const track: Track = {};
    this.tracks[`#${id}`] = track;
    return new Widget(id, element);
  }

  public destroyWidget (widget: Widget) {
    delete this.elements[widget.id];
    delete this.tracks[`#${widget.id}`];
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

  public selectElement (widget: Widget) {
    if (this.selection) {
      this.selection.destroy();
    }
    this.selection = new Gizmo(widget.element);
    this.selection.addEventListener("keyframe", () => this.onSelectionKeyframe());
  }
}
