import {Timeline, Track, Tracks} from "./timeline";
import {Compress} from "./compression";
import {Gizmo} from "./gizmo";
import {Utility} from "./utility";
import {VideoPlayer} from "./videoPlayer";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const uuidv4: typeof import("uuid/v4") = require("uuid/v4");

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export interface WidgetInit {
  id?: string;
  type: "image" | "text";
  src: string;
}

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
  private widgetContainer: HTMLDivElement;

  private videoPlayer: VideoPlayer;

  private timeline: Timeline;

  public selection: Gizmo = null;

  private widgets: Widget[] = [];

  public updateExternally = false;

  public constructor (
    container: HTMLDivElement,
    widgetContainer: HTMLDivElement,
    videoPlayer: VideoPlayer,
    timeline: Timeline
  ) {
    this.widgetContainer = widgetContainer;
    this.videoPlayer = videoPlayer;
    this.timeline = timeline;
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

    const deselectElement = (event: Event) => {
      if (event.target === widgetContainer) {
        this.selectWidget(null);
      }
    };

    widgetContainer.addEventListener("mousedown", deselectElement);
    widgetContainer.addEventListener("touchstart", deselectElement);
    widgetContainer.addEventListener("keydown", (event) => {
      if (event.key === "Delete" && this.selection) {
        this.destroyWidget(this.selection.widget);
      }
    });
  }

  public updateMarkers () {
    if (this.selection) {
      const track = this.timeline.tracks[`#${this.selection.widget.element.id}`];
      this.videoPlayer.setMarkers(Object.keys(track).map((str) => parseFloat(str)));
    } else {
      this.videoPlayer.setMarkers([]);
    }
  }

  public updateTracks () {
    this.timeline.updateTracks();
    this.updateMarkers();
  }

  public saveToBase64 () {
    const json = JSON.stringify(this.save());
    return Compress.compress(json);
  }

  public async loadFromBase64 (base64: string) {
    const json = await Compress.decompress(base64);
    this.load(JSON.parse(json));
  }

  private save (): SerializedData {
    return {
      tracks: JSON.parse(JSON.stringify(this.timeline.tracks)),
      videoSrc: this.videoPlayer.getSrc(),
      widgets: this.widgets.map((widget) => JSON.parse(JSON.stringify(widget.init)))
    };
  }

  private async load (data: SerializedData) {
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
    if (this.updateExternally) {
      return;
    }
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
      const img = document.createElement("img");
      img.dataset.type = init.type;
      img.crossOrigin = "anonymous";
      img.src = init.src;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.style.left = `${-img.width / 2}px`;
      img.style.top = `${-img.height / 2}px`;
      return img;
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
    element.ondragstart = (event) => {
      event.preventDefault();
      return false;
    };
    const {video} = this.videoPlayer;
    element.style.transform = Utility.transformToCss(Utility.centerTransform(video.videoWidth, video.videoHeight));
    this.widgetContainer.appendChild(element);

    const track: Track = {};
    this.timeline.tracks[`#${id}`] = track;
    this.updateTracks();
    const widget = new Widget(element, init);
    this.widgets.push(widget);

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
    if (this.selection && widget && this.selection.widget.element === widget.element) {
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
      this.widgetContainer.focus();
      this.selection = new Gizmo(widget);
      this.selection.addEventListener("keyframe", () => this.keyframe(this.selection.widget.element));
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
      transform: Utility.transformToCss(Utility.getTransform(element)),
      visibility: "visible"
    };
    this.updateTracks();
  }
}
