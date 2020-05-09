import "./videoPlayer.css";
import {AttributedSource, Deferred, Size, TARGET_CANVAS_SIZE, TimeRange, resizeKeepAspect} from "./utility";

interface Point {
  clientX: number;
  clientY: number;
}

export class VideoPlayer {
  public readonly video: HTMLVideoElement;

  private controlsContainer: HTMLDivElement;

  private playPauseButton: HTMLDivElement;

  private position: HTMLDivElement;

  private timeline: HTMLDivElement;

  private selection: HTMLDivElement;

  private readonly markers: HTMLDivElement[] = [];

  public loadPromise = new Deferred<void>();

  public selectionStartNormalized = 0;

  public selectionEndNormalized = 1;

  public constructor (videoParent: HTMLDivElement, controlsParent: HTMLElement) {
    this.video = document.createElement("video");
    videoParent.appendChild(this.video);
    this.video.className = "videoPlayer";
    this.video.crossOrigin = "anonymous";
    this.video.loop = true;
    this.video.muted = true;

    this.video.setAttribute("webkit-playsinline", "true");
    this.video.setAttribute("playsinline", "true");
    (this.video as any).playsInline = true;
    (this.video as any).playsinline = true;

    (this.video as any).disableRemotePlayback = true;
    this.video.oncontextmenu = () => false;

    this.controlsContainer = document.createElement("div");
    this.controlsContainer.className = "videoControlsContainer";
    controlsParent.appendChild(this.controlsContainer);

    this.playPauseButton = document.createElement("div");
    this.controlsContainer.appendChild(this.playPauseButton);
    this.playPauseButton.className = "videoPlayPauseButton button fas fa-play";

    this.video.addEventListener("play", () => {
      this.playPauseButton.classList.remove("fa-play");
      this.playPauseButton.classList.add("fa-pause");
    });
    this.video.addEventListener("pause", () => {
      this.playPauseButton.classList.remove("fa-pause");
      this.playPauseButton.classList.add("fa-play");
    });
    this.playPauseButton.addEventListener("click", () => {
      if (this.video.paused) {
        this.video.play().catch(() => 0);
      } else {
        this.video.pause();
      }
    });

    this.timeline = document.createElement("div");
    this.controlsContainer.appendChild(this.timeline);
    this.timeline.className = "videoTimeline";

    this.selection = document.createElement("div");
    this.timeline.appendChild(this.selection);
    this.selection.className = "videoSelection";

    this.position = document.createElement("div");
    this.timeline.appendChild(this.position);
    this.position.className = "videoPosition";

    const updatePosition = () => {
      const interpolant = this.video.currentTime / this.video.duration;
      this.position.style.width = `${interpolant * 100}%`;
    };
    window.addEventListener("update", updatePosition);

    const updateTimelineFromPoint = (event: Point, start: boolean) => {
      const rect = this.timeline.getBoundingClientRect();
      const left = event.clientX - rect.left;
      const interpolant = Math.max(Math.min(left / rect.width, 0.9999), 0);
      this.video.currentTime = this.video.duration * interpolant;
      updatePosition();
      if (start) {
        this.selectionStartNormalized = interpolant;
      }
      this.selectionEndNormalized = interpolant;

      const selectionRange = this.getSelectionRangeInOrder();
      this.selection.style.left = `${selectionRange[0] * 100}%`;
      this.selection.style.right = `${(1 - selectionRange[1]) * 100}%`;
    };

    const onTouchMove = (event: TouchEvent) => {
      updateTimelineFromPoint(event.touches[0], event.type === "touchstart");
    };
    this.timeline.addEventListener("touchstart", (event) => {
      this.timeline.addEventListener("touchmove", onTouchMove);
      onTouchMove(event);
    });
    this.timeline.addEventListener("touchend", () => {
      this.timeline.removeEventListener("touchmove", onTouchMove);
    });

    const onPointerMove = (event: PointerEvent) => {
      updateTimelineFromPoint(event, event.type === "pointerdown");
    };
    this.timeline.addEventListener("pointerdown", (event) => {
      this.timeline.setPointerCapture(event.pointerId);
      this.timeline.addEventListener("pointermove", onPointerMove);
      onPointerMove(event);
    });
    this.timeline.addEventListener("pointerup", (event) => {
      this.timeline.releasePointerCapture(event.pointerId);
      this.timeline.removeEventListener("pointermove", onPointerMove);
    });

    this.video.addEventListener("canplaythrough", () => {
      this.loadPromise.resolve();
      // Other libraries such as OpenCV.js rely on video.width/height being set.
      this.video.width = this.video.videoWidth;
      this.video.height = this.video.videoHeight;
    });
  }

  public getSelectionRangeInOrder (): TimeRange {
    if (this.selectionStartNormalized > this.selectionEndNormalized) {
      return [
        this.selectionEndNormalized,
        this.selectionStartNormalized
      ];
    }
    return [
      this.selectionStartNormalized,
      this.selectionEndNormalized
    ];
  }

  public hideVideo () {
    this.video.style.visibility = "hidden";
  }

  public showVideo () {
    this.video.style.visibility = "";
  }

  public async setAttributedSrc (attributedSource: AttributedSource) {
    if (this.video.src) {
      this.loadPromise = new Deferred<void>();
    }
    this.video.src = attributedSource.src;
    this.video.dataset.src = attributedSource.src;
    this.video.dataset.attribution = attributedSource.attribution;
    await this.loadPromise;
  }

  public getAttributedSrc (): AttributedSource {
    return {
      attribution: this.video.dataset.attribution,
      src: this.video.dataset.src
    };
  }

  public setMarkers (normalizedMarkerTimes: number[]) {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers.length = 0;

    for (const normalizedMarkerTime of normalizedMarkerTimes) {
      const marker = document.createElement("div");
      this.timeline.appendChild(marker);
      marker.className = "videoMarker";
      marker.style.left = `${normalizedMarkerTime * 100}%`;
      this.markers.push(marker);
    }
  }

  public getRawSize (): Size {
    return [
      this.video.videoWidth || 1280,
      this.video.videoHeight || 720
    ];
  }

  public getAspectSize () {
    return resizeKeepAspect(this.getRawSize(), TARGET_CANVAS_SIZE);
  }

  public getNormalizedCurrentTime () {
    return this.video.currentTime / (this.video.duration || 1);
  }
}
