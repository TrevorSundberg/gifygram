import "./videoPlayer.css";

interface Point {
  clientX: number;
  clientY: number;
}

export class VideoPlayer {
  private container: HTMLDivElement;

  public readonly video: HTMLVideoElement;

  private controlsContainer: HTMLDivElement;

  private playPauseButton: HTMLDivElement;

  private position: HTMLDivElement;

  private timeline: HTMLDivElement;

  private readonly markers: HTMLDivElement[] = [];

  public constructor (container: HTMLDivElement) {
    this.container = container;

    this.video = document.createElement("video");
    this.container.appendChild(this.video);
    this.video.className = "videoPlayer";
    this.video.loop = true;
    this.video.muted = true;
    (this.video as any).disableRemotePlayback = true;
    this.video.oncontextmenu = () => false;
    this.video.src = require("../public/sample.mp4").default;

    this.controlsContainer = document.createElement("div");
    this.controlsContainer.className = "videoControlsContainer";
    this.container.appendChild(this.controlsContainer);

    this.playPauseButton = document.createElement("div");
    this.controlsContainer.appendChild(this.playPauseButton);
    this.playPauseButton.className = "videoPlayPauseButton button fas fa-play";

    this.playPauseButton.addEventListener("click", () => {
      if (this.video.paused) {
        this.video.play();
        this.playPauseButton.classList.remove("fa-play");
        this.playPauseButton.classList.add("fa-pause");
      } else {
        this.video.pause();
        this.playPauseButton.classList.remove("fa-pause");
        this.playPauseButton.classList.add("fa-play");
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
    this.timeline.addEventListener("touchstart", onTouchMove);
    this.timeline.addEventListener("touchmove", onTouchMove);
    this.timeline.addEventListener("touchend", onTouchMove);

    const onPointerMove = (event: PointerEvent) => {
      updateTimelineFromPoint(event);
    };
    this.timeline.addEventListener("pointerdown", (event) => {
      this.timeline.setPointerCapture(event.pointerId);
      this.timeline.addEventListener("pointermove", onPointerMove);
      updateTimelineFromPoint(event);
    });
    this.timeline.addEventListener("pointerup", (event) => {
      this.timeline.releasePointerCapture(event.pointerId);
      this.timeline.removeEventListener("pointermove", onPointerMove);
      updateTimelineFromPoint(event);
    });
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
      marker.style.left = `${markerTime * 100}%`;
      this.markers.push(marker);
    }
  }
}
