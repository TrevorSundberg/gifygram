import "./videoPlayer.css";

export class VideoPlayer {
  private container: HTMLDivElement;

  public readonly video: HTMLVideoElement;

  private controlsContainer: HTMLDivElement;

  private playPauseButton: HTMLDivElement;

  private position: HTMLDivElement;

  private timeline: HTMLDivElement;

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
    this.playPauseButton.className = "videoPlayPauseButton";

    this.timeline = document.createElement("div");
    this.controlsContainer.appendChild(this.timeline);
    this.timeline.className = "videoTimeline";

    this.position = document.createElement("div");
    this.timeline.appendChild(this.position);
    this.position.className = "videoPosition";

    this.playPauseButton.addEventListener("click", () => {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    });

    const updatePosition = () => {
      const interpolant = this.video.currentTime / this.video.duration;
      this.position.style.width = `${interpolant * 100}%`;
    };
    setInterval(updatePosition, 0);

    const updateTimelineFromPointer = (event: PointerEvent) => {
      const rect = this.timeline.getBoundingClientRect();
      const left = event.clientX - rect.left;
      const interpolant = Math.min(left / rect.width, 0.9999);
      this.video.currentTime = this.video.duration * interpolant;
      updatePosition();
    };

    const onPointerMove = (event: PointerEvent) => {
      updateTimelineFromPointer(event);
    };

    this.timeline.addEventListener("pointerdown", (event) => {
      this.timeline.setPointerCapture(event.pointerId);
      this.timeline.addEventListener("pointermove", onPointerMove);
      updateTimelineFromPointer(event);
    });
    this.timeline.addEventListener("pointerup", (event) => {
      this.timeline.releasePointerCapture(event.pointerId);
      this.timeline.removeEventListener("pointermove", onPointerMove);
      updateTimelineFromPointer(event);
    });
  }
}
