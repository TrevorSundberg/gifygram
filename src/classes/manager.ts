import {Timeline, Track} from "./timeline";
import {Gizmo} from "./gizmo";
import {Widget} from "./widget";

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export class Manager {
  private video: HTMLVideoElement;

  private timeline = new Timeline()

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
    element.tabIndex = 0;
    element.draggable = false;
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

    const track: Track = {};
    this.timeline.tracks[`#${id}`] = track;
    this.timeline.updateTracks();
    const widget = new Widget(id, element);

    element.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.destroyWidget(widget);
      }
    });

    const grabElement = (event) => {
      element.focus();
      this.selection.moveable.dragStart(event);
    };
    element.addEventListener("mousedown", grabElement, true);
    element.addEventListener("touchstart", grabElement, true);
    element.addEventListener("focus", () => {
      this.selectWidget(widget);
    });

    element.addEventListener("blur", (event) => {
      if (this.selection.element === event.target) {
        this.selection.destroy();
        this.selection = null;
      }
    });

    return widget;
  }

  private selectWidget (widget: Widget) {
    if (this.selection && this.selection.element === widget.element) {
      return;
    }
    if (this.selection) {
      this.selection.destroy();
    }
    this.selection = new Gizmo(widget.element);
    this.selection.addEventListener("keyframe", () => this.onSelectionKeyframe());
  }

  public destroyWidget (widget: Widget) {
    widget.element.remove();
    delete this.timeline.tracks[`#${widget.id}`];
    this.timeline.updateTracks();
  }

  private onSelectionKeyframe () {
    const {element} = this.selection;
    const track = this.timeline.tracks[`#${element.id}`];
    track[this.video.currentTime] = {
      transform: Gizmo.getTransformCss(this.selection.getTransform()),
      visibility: "visible"
    };
    this.timeline.updateTracks();
  }
}
