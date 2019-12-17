import {Timeline, Track, Tracks} from "./timeline";
import {Gizmo} from "./gizmo";
import {Widget} from "./widget";

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export interface WidgetImage {
  type: "image";
  src: string;
}

export interface WidgetText {
  type: "text";
}

export type WidgetInit = WidgetImage | WidgetText;

export interface SerializedData {
  tracks: Tracks;
  widgets: WidgetInit[];
}

export class Manager {
  private video: HTMLVideoElement;

  private timeline = new Timeline()

  private selection: Gizmo = null;

  private idCounter = 0;

  public constructor (video: HTMLVideoElement) {
    this.video = video;
    this.update();
  }

  private save () {
    return 0;
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

  public async addWidget (init: WidgetInit): Promise<Widget> {
    const element = await (async () => {
      switch (init.type) {
        case "image":
        {
          const img = document.createElement("img");
          img.src = init.src;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          return img;
        }
        case "text":
        {
          const div = document.createElement("div");
          div.contentEditable = "true";
          div.textContent = "Text";
          document.body.appendChild(div);
          return div;
        }
        default:
          throw new Error("Invalid widget init type");
      }
    })();

    const id = `id${this.idCounter++}`;
    element.id = id;
    element.className = "widget";
    element.tabIndex = 0;
    element.draggable = false;
    document.body.appendChild(element);

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
