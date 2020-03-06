import "./videoPlayer.css";
import {AttributedSource, Deferred} from "./utility";

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

  private readonly markers: HTMLDivElement[] = [];

  public loadPromise = new Deferred<void>();

  public constructor (videoParent: HTMLDivElement, controlsParent: HTMLElement) {
    this.video = document.createElement("video");
    videoParent.appendChild(this.video);
    this.video.className = "videoPlayer";
    this.video.crossOrigin = "anonymous";
    this.video.loop = true;
    this.video.muted = true;
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
        this.video.play();
      } else {
        this.video.pause();
      }
    });

    this.timeline = document.createElement("div");
    this.controlsContainer.appendChild(this.timeline);
    this.timeline.className = "videoTimeline";

    this.position = document.createElement("div");
    this.timeline.appendChild(this.position);
    this.position.className = "videoPosition";

    const updatePosition = () => {
      const interpolant = this.video.currentTime / this.video.duration;
      this.position.style.width = `${interpolant * 100}%`;
    };
    window.addEventListener("update", updatePosition);

    const updateTimelineFromPoint = (event: Point) => {
      const rect = this.timeline.getBoundingClientRect();
      const left = event.clientX - rect.left;
      const interpolant = Math.min(left / rect.width, 0.9999);
      this.video.currentTime = this.video.duration * interpolant;
      updatePosition();
    };

    const onTouchMove = (event: TouchEvent) => {
      updateTimelineFromPoint(event.touches[0]);
    };
    this.timeline.addEventListener("touchstart", (event) => {
      this.timeline.addEventListener("touchmove", onTouchMove);
      onTouchMove(event);
    });
    this.timeline.addEventListener("touchend", () => {
      this.timeline.removeEventListener("touchmove", onTouchMove);
    });

    const onPointerMove = (event: PointerEvent) => {
      updateTimelineFromPoint(event);
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
    this.video.dataset.as = attributedSource.src;
    this.video.dataset.attribution = attributedSource.attribution;
    await this.loadPromise;
  }

  public getAttributedSrc (): AttributedSource {
    return {
      attribution: this.video.dataset.attribution,
      src: this.video.dataset.src
    };
  }

  public setMarkers (markerTimes: number[]) {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers.length = 0;

    for (const markerTime of markerTimes) {
      const marker = document.createElement("div");
      this.timeline.appendChild(marker);
      marker.className = "videoMarker";
      const interpolant = markerTime / this.video.duration;
      marker.style.left = `${interpolant * 100}%`;
      this.markers.push(marker);
    }
  }
}
