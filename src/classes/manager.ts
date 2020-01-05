import {Timeline, TimelineEvent, Track, Tracks} from "./timeline";
import {Gizmo} from "./gizmo";
import {Utility} from "./utility";
import {VideoPlayer} from "./videoPlayer";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const uuidv4: typeof import("uuid/v4") = require("uuid/v4");

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export interface WidgetConstructor {
  id?: string;
}

export interface WidgetImage extends WidgetConstructor {
  type: "image";
  src: string;
}

export interface WidgetText extends WidgetConstructor {
  type: "text";
}

export type WidgetInit = WidgetImage | WidgetText;

export interface SerializedData {
  tracks: Tracks;
  videoSrc: string;
  widgets: WidgetInit[];
}

export class Widget {
  public readonly element: HTMLElement;

  public readonly init: WidgetInit;

  /** @internal */
  public constructor (element: HTMLElement, init: WidgetInit) {
    this.element = element;
    this.init = init;
  }
}

export class Manager {
  private container: HTMLDivElement;

  private widgetContainer: HTMLDivElement;

  private videoPlayer: VideoPlayer;

  private timeline = new Timeline()

  public selection: Gizmo = null;

  private widgets: Widget[] = [];

  public constructor (container: HTMLDivElement, widgetContainer: HTMLDivElement, videoPlayer: VideoPlayer) {
    this.container = container;
    this.widgetContainer = widgetContainer;
    this.videoPlayer = videoPlayer;
    this.update();

    const updateContainerSize = (videoWidth: number, videoHeight: number, scale: number) => {
      container.style.width = `${videoWidth}px`;
      container.style.height = `${videoHeight}px`;
      container.style.transform = `translate(${0}px, ${0}px) scale(${scale})`;

      const width = videoWidth * scale;
      const height = videoHeight * scale;

      container.style.left = `${(window.innerWidth - width) / 2}px`;
      container.style.top = `${(window.innerHeight - height) / 2}px`;
    };

    const onResize = () => {
      const videoWidth = videoPlayer.video.videoWidth || 1280;
      const videoHeight = videoPlayer.video.videoHeight || 720;
      const videoAspect = videoWidth / videoHeight;
      const windowAspect = window.innerWidth / window.innerHeight;

      if (videoAspect > windowAspect) {
        updateContainerSize(videoWidth, videoHeight, window.innerWidth / videoWidth);
      } else {
        updateContainerSize(videoWidth, videoHeight, window.innerHeight / videoHeight);
      }
    };
    videoPlayer.video.addEventListener("canplay", onResize);
    window.addEventListener("resize", onResize);
    onResize();

    const onUpdate = () => {
      requestAnimationFrame(onUpdate);
      window.dispatchEvent(new Event("update"));
    };
    onUpdate();

    window.addEventListener("update", () => this.update());

    const deselectElement = () => this.selectWidget(null);

    widgetContainer.addEventListener("mousedown", deselectElement, true);
    widgetContainer.addEventListener("touchstart", deselectElement, true);
  }

  public save (): SerializedData {
    return {
      tracks: JSON.parse(JSON.stringify(this.timeline.tracks)),
      videoSrc: this.videoPlayer.getSrc(),
      widgets: this.widgets.map((widget) => JSON.parse(JSON.stringify(widget.init)))
    };
  }

  public updateMarkers () {
    if (this.selection) {
      const track = this.timeline.tracks[`#${this.selection.element.id}`];
      this.videoPlayer.setMarkers(Object.keys(track).map((str) => parseFloat(str)));
    } else {
      this.videoPlayer.setMarkers([]);
    }
  }

  public updateTracks () {
    this.timeline.updateTracks();
    this.updateMarkers();
  }

  public async load (data: SerializedData) {
    this.videoPlayer.setSrc(data.videoSrc);
    this.clearWidgets();
    for (const init of data.widgets) {
      await this.addWidget(init);
    }
    this.timeline.tracks = data.tracks;
    this.updateTracks();
    // Force a change so everything updates
    this.timeline.setTime(1);
    this.timeline.setTime(0);
    this.videoPlayer.video.currentTime = 0;
  }

  private update () {
    const {currentTime} = this.videoPlayer.video;
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
          img.style.left = `${-img.width / 2}px`;
          img.style.top = `${-img.height / 2}px`;
          return img;
        }
        case "text":
        {
          const div = document.createElement("div");
          div.contentEditable = "true";
          div.textContent = "Text";
          div.addEventListener("frame", (event: TimelineEvent) => {
            const text = event.frame.get("text") || "";
            div.textContent = text;
          });
          div.addEventListener("input", () => {
            this.keyframe(div);
          });
          return div;
        }
        default:
          throw new Error("Invalid widget init type");
      }
    })();

    if (!init.id) {
      init.id = `id-${uuidv4()}`;
    }
    const {id} = init;
    if (this.timeline.tracks[`#${id}`]) {
      throw new Error(`Widget id already exists: ${id}`);
    }

    element.id = id;
    element.className = "widget";
    element.draggable = false;
    const {video} = this.videoPlayer;
    element.style.transform = Utility.transformToCss(Utility.centerTransform(video.videoWidth, video.videoHeight));
    this.widgetContainer.appendChild(element);

    const track: Track = {};
    this.timeline.tracks[`#${id}`] = track;
    this.updateTracks();
    const widget = new Widget(element, init);
    this.widgets.push(widget);

    element.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.destroyWidget(widget);
      }
    });

    const grabElement = (event) => {
      this.selectWidget(widget);
      this.selection.moveable.dragStart(event);
    };
    element.addEventListener("mousedown", grabElement, true);
    element.addEventListener("touchstart", grabElement, true);

    this.selectWidget(widget);
    return widget;
  }

  private isSelected (widget?: Widget) {
    if (this.selection === null && widget === null) {
      return true;
    }
    if (this.selection && widget && this.selection.element === widget.element) {
      return true;
    }
    return false;
  }

  public selectWidget (widget?: Widget) {
    if (this.isSelected(widget)) {
      return;
    }
    if (this.selection) {
      this.selection.destroy();
      this.selection = null;
    }
    if (widget) {
      this.selection = new Gizmo(widget.element);
      this.selection.addEventListener("keyframe", () => this.keyframe(this.selection.element));
    }
    this.updateMarkers();
  }

  public destroyWidget (widget: Widget) {
    if (this.isSelected(widget)) {
      this.selectWidget(null);
    }
    widget.element.remove();
    delete this.timeline.tracks[`#${widget.init.id}`];
    this.updateTracks();
    this.widgets.splice(this.widgets.indexOf(widget), 1);
  }

  public clearWidgets () {
    while (this.widgets.length !== 0) {
      this.destroyWidget(this.widgets[0]);
    }
  }

  private keyframe (element: HTMLElement) {
    const track = this.timeline.tracks[`#${element.id}`];
    track[this.videoPlayer.video.currentTime] = {
      text: element.textContent,
      transform: Utility.transformToCss(Utility.getTransform(element)),
      visibility: "visible"
    };
    this.updateTracks();
  }
}
