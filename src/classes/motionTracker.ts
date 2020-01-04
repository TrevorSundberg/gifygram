/* eslint-disable new-cap */
import {VideoPlayer} from "./videoPlayer";
import {VideoSeeker} from "./videoSeeker";
import jsfeat from "jsfeat";

export class MotionTrackerEvent extends Event {
  public progress: number;
}

export class MotionTracker extends VideoSeeker {
  private readonly canvas = document.createElement("canvas");

  private readonly context: CanvasRenderingContext2D;

  private currentPyramid = new jsfeat.pyramid_t(3);

  private previousPyramid = new jsfeat.pyramid_t(3);

  private readonly pointStatus = new Uint8Array(100);

  private previousXY = new Float32Array(100 * 2);

  private currentXY = new Float32Array(100 * 2);

  private pointCount = 0;

  private readonly windowSize = 40;

  private readonly maxIterations = 50;

  private readonly epsilon = 0.001;

  private readonly minEigen = 0.0001;

  public constructor (player: VideoPlayer) {
    super(player);
    this.context = this.canvas.getContext("2d");
  }

  public async track () {
    await this.player.loadPromise;
    const width = this.player.video.videoWidth;
    const height = this.player.video.videoHeight;

    this.currentPyramid.allocate(width, height, jsfeat.U8_t | jsfeat.C1_t);
    this.previousPyramid.allocate(width, height, jsfeat.U8_t | jsfeat.C1_t);

    this.canvas.width = width;
    this.canvas.height = height;

    this.buildPyramidFromVideoImage(this.currentPyramid);

    await this.run(this.player.video.currentTime);
  }

  public addPoint (x: number, y: number) {
    this.currentXY[this.pointCount << 1] = x;
    this.currentXY[(this.pointCount << 1) + 1] = y;
    ++this.pointCount;
  }

  private buildPyramidFromVideoImage (pyramid: any) {
    const {video} = this.player;
    const width = video.videoWidth;
    const height = video.videoHeight;

    this.context.drawImage(video, 0, 0, width, height);
    const imageData = this.context.getImageData(0, 0, width, height);

    const [currentData] = pyramid.data;
    jsfeat.imgproc.grayscale(imageData.data, width, height, currentData);

    pyramid.build(currentData, true);
  }

  protected async onFrame (progress: number) {
    const tempXY = this.previousXY;
    this.previousXY = this.currentXY;
    this.currentXY = tempXY;

    const tempPyramid = this.previousPyramid;
    this.previousPyramid = this.currentPyramid;
    this.currentPyramid = tempPyramid;

    this.buildPyramidFromVideoImage(this.currentPyramid);

    jsfeat.optical_flow_lk.track(
      this.previousPyramid,
      this.currentPyramid,
      this.previousXY,
      this.currentXY,
      this.pointCount,
      this.windowSize,
      this.maxIterations,
      this.pointStatus,
      this.epsilon,
      this.minEigen
    );

    this.prunePoints();

    const toSend = new MotionTrackerEvent("frame");
    toSend.progress = progress;
    this.dispatchEvent(toSend);
  }

  private prunePoints () {
    let i = 0;
    let j = 0;

    for (; i < this.pointCount; ++i) {
      if (this.pointStatus[i] === 1) {
        if (j < i) {
          this.currentXY[j << 1] = this.currentXY[i << 1];
          this.currentXY[(j << 1) + 1] = this.currentXY[(i << 1) + 1];
        }
        console.log(this.currentXY[j << 1], this.currentXY[(j << 1) + 1]);
        ++j;
      }
    }
    this.pointCount = j;
  }
}
