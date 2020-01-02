import {VideoPlayer} from "./videoPlayer";
import cv from "opencv.js";

export class MotionTracker {
  public async process (player: VideoPlayer) {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.id = "canvasOutput";
    canvas.style.transform = "translateZ(1px)";

    const {video} = player;
    await player.loadPromise;
    const cap = new cv.VideoCapture(video);

    // Parameters for ShiTomasi corner detection
    const [
      maxCorners,
      qualityLevel,
      minDistance,
      blockSize
    ] = [
      30,
      0.3,
      7,
      7
    ];

    // Parameters for lucas kanade optical flow
    const winSize = new cv.Size(15, 15);
    const maxLevel = 2;
    const criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03);

    // Create some random colors
    const color = [];
    for (let colorIterator = 0; colorIterator < maxCorners; ++colorIterator) {
      color.push(new cv.Scalar(0, 0, 255, 255));
    }

    // Take first frame and find corners in it
    const {width} = video;
    const {height} = video;
    const oldFrame = new cv.Mat(height, width, cv.CV_8UC4);
    cap.read(oldFrame);
    const oldGray = new cv.Mat();
    cv.cvtColor(oldFrame, oldGray, cv.COLOR_RGB2GRAY);
    let p0 = new cv.Mat();
    const none = new cv.Mat();
    cv.goodFeaturesToTrack(oldGray, p0, maxCorners, qualityLevel, minDistance, none, blockSize);

    // Create a mask image for drawing purposes
    const zeroEle = new cv.Scalar(0, 0, 0, 255);
    const mask = new cv.Mat(oldFrame.rows, oldFrame.cols, oldFrame.type(), zeroEle);

    const frame = new cv.Mat(height, width, cv.CV_8UC4);
    const frameGray = new cv.Mat();
    const p1 = new cv.Mat();
    const st = new cv.Mat();
    const err = new cv.Mat();

    const streaming = true;
    const FPS = 30;
    const processVideo = () => {
      if (!streaming) {
        // Clean and stop.
        frame.delete();
        oldGray.delete();
        p0.delete();
        p1.delete();
        err.delete();
        mask.delete();
        return;
      }
      const begin = Date.now();

      // Start processing.
      cap.read(frame);
      cv.cvtColor(frame, frameGray, cv.COLOR_RGBA2GRAY);

      // Calculate optical flow
      cv.calcOpticalFlowPyrLK(oldGray, frameGray, p0, p1, st, err, winSize, maxLevel, criteria);

      // Select good points
      const goodNew = [];
      const goodOld = [];
      for (let row = 0; row < st.rows; ++row) {
        if (st.data[row] === 1) {
          goodNew.push(new cv.Point(p1.data32F[row * 2], p1.data32F[row * 2 + 1]));
          goodOld.push(new cv.Point(p0.data32F[row * 2], p0.data32F[row * 2 + 1]));
        }
      }

      // Draw the tracks
      for (let trackIterator = 0; trackIterator < goodNew.length; ++trackIterator) {
        cv.line(mask, goodNew[trackIterator], goodOld[trackIterator], color[trackIterator], 2);
        cv.circle(frame, goodNew[trackIterator], 5, color[trackIterator], -1);
      }
      cv.add(frame, mask, frame);

      cv.imshow("canvasOutput", frame);

      // Now update the previous frame and previous points
      frameGray.copyTo(oldGray);
      p0.delete();
      p0 = null;
      p0 = new cv.Mat(goodNew.length, 1, cv.CV_32FC2);
      for (let iterator = 0; iterator < goodNew.length; ++iterator) {
        p0.data32F[iterator * 2] = goodNew[iterator].x;
        p0.data32F[iterator * 2 + 1] = goodNew[iterator].y;
      }

      // Schedule the next one.
      const delay = 1000 / FPS - (Date.now() - begin);
      setTimeout(processVideo, delay);
    };

    // Schedule the first one.
    setTimeout(processVideo, 0);
  }
}
