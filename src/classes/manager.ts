import {Timeline, Track} from "./timeline";
import {Gizmo} from "./gizmo";
import {Widget} from "./widget";

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export class Manager {
  private video: HTMLVideoElement;

  private timeline = new Timeline()

  private elements: Record<string, HTMLElement> = {};

  private selection: Gizmo = null;

  private idCounter = 0;

  public constructor (video: HTMLVideoElement) {
    this.video = video;
    this.update();
  }

  private update () {
    requestAnimationFrame(() => {
      this.update();
    });
    const {currentTime} = this.video;
    if (this.timeline.getTime() !== currentTime) {
      this.timeline.setTime(currentTime);
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
      Manager.finalizeElement(id, element);
      return element;
    };
  }

  public static createText (): ElementFactory {
    return async (id: string) => {
      const element = document.createElement("div");
      element.contentEditable = "true";
      element.textContent = "Text";
      document.body.appendChild(element);
      Manager.finalizeElement(id, element);
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
    this.timeline.tracks[`#${id}`] = track;
    this.timeline.updateTracks();
    return new Widget(id, element);
  }

  public destroyWidget (widget: Widget) {
    delete this.elements[widget.id];
    delete this.timeline.tracks[`#${widget.id}`];
    this.timeline.updateTracks();
  }

  private onSelectionKeyframe () {
    const {element} = this.selection;
    const track = this.timeline.tracks[`#${element.id}`];
    track[this.video.currentTime] = {
      active: true,
      transform: Gizmo.getTransformCss(this.selection.getTransform())
    };
    this.timeline.updateTracks();
  }

  public selectElement (widget: Widget) {
    if (this.selection) {
      this.selection.destroy();
    }
    this.selection = new Gizmo(widget.element);
    this.selection.addEventListener("keyframe", () => this.onSelectionKeyframe());
  }
}
