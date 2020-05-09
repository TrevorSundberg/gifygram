/* eslint-disable new-cap */
import {VideoSeeker, VideoSeekerFrame} from "./videoSeeker";
import {VideoPlayer} from "./videoPlayer";
import jsfeat from "jsfeat";

export class MotionTrackerEvent {
  public progress: number;

  public found: boolean;

  public x: number;

  public y: number;
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

  public onMotionFrame: (event: MotionTrackerEvent) => Promise<void>;

  public constructor (player: VideoPlayer) {
    super(player);
    this.context = this.canvas.getContext("2d");
  }

  public async track () {
    await this.player.loadPromise;
    const size = this.player.getAspectSize();

    this.currentPyramid.allocate(size[0], size[1], jsfeat.U8_t | jsfeat.C1_t);
    this.previousPyramid.allocate(size[0], size[1], jsfeat.U8_t | jsfeat.C1_t);

    [
      this.canvas.width,
      this.canvas.height
    ] = size;

    this.buildPyramidFromVideoImage(this.currentPyramid);

    await this.run(this.player.video.currentTime);
  }

  public addPoint (x: number, y: number) {
    this.currentXY[this.pointCount << 1] = x;
    this.currentXY[(this.pointCount << 1) + 1] = y;
    ++this.pointCount;
  }

  private buildPyramidFromVideoImage (pyramid: any) {
    const size = this.player.getAspectSize();

    this.context.drawImage(this.player.video, 0, 0, size[0], size[1]);
    const imageData = this.context.getImageData(0, 0, size[0], size[1]);

    const [currentData] = pyramid.data;
    jsfeat.imgproc.grayscale(imageData.data, size[0], size[1], currentData);

    pyramid.build(currentData, true);
  }

  protected async onFrame (frame: VideoSeekerFrame) {
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

    const toSend = new MotionTrackerEvent();
    if (this.pointCount !== 0) {
      toSend.found = true;
      [
        toSend.x,
        toSend.y
      ] = this.currentXY;
    }
    toSend.progress = frame.progress;
    await this.onMotionFrame(toSend);
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
        ++j;
      }
    }
    this.pointCount = j;
  }
}
