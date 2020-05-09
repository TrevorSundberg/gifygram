import gifFrames from "gif-frames";

export abstract class Image {
  public static setImage (element: HTMLImageElement, image: Image) {
    (element as any).patched_image = image;
  }

  public static getImage (element: HTMLImageElement): Image {
    return (element as any).patched_image;
  }

  public loadPromise: Promise<unknown>;

  public abstract getFrameAtTime (time: number): HTMLCanvasElement | HTMLImageElement;
}

export class StaticImage extends Image {
  private img: HTMLImageElement;

  public constructor (url: string) {
    super();
    this.img = document.createElement("img");
    this.img.crossOrigin = "anonymous";
    this.img.src = url;
    this.loadPromise = new Promise((resolve, reject) => {
      this.img.onload = resolve;
      this.img.onerror = reject;
    });
  }

  public getFrameAtTime (): HTMLImageElement {
    return this.img;
  }
}

interface Frame {
  canvas: HTMLCanvasElement;
  delaySeconds: number;
}

export class Gif extends Image {
  private frames: Frame[];

  private totalTime = 0;

  public constructor (url: string) {
    super();

    const renderCumulativeFrames = (frameData: any[]) => {
      if (frameData.length === 0) {
        return frameData;
      }
      const previous = document.createElement("canvas");
      const previousContext = previous.getContext("2d");
      const current = document.createElement("canvas");
      const currentContext = current.getContext("2d");

      // Setting the canvas width will clear the canvas, so we only want to do it once.
      const firstFrameCanvas = frameData[0].getImage() as HTMLCanvasElement;

      // It also apperas that 'gif-frames' always returns a consistent sized canvas for all frames.
      previous.width = firstFrameCanvas.width;
      previous.height = firstFrameCanvas.height;
      current.width = firstFrameCanvas.width;
      current.height = firstFrameCanvas.height;

      for (const frame of frameData) {
        // Copy the current to the previous.
        previousContext.clearRect(0, 0, previous.width, previous.height);
        previousContext.drawImage(current, 0, 0);

        // Draw the current frame to the cumulative buffer.
        const canvas = frame.getImage() as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        currentContext.drawImage(canvas, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(current, 0, 0);

        const {frameInfo} = frame;
        const {disposal} = frameInfo;
        // If the disposal method is clear to the background color, then clear the canvas.
        if (disposal === 2) {
          currentContext.clearRect(frameInfo.x, frameInfo.y, frameInfo.width, frameInfo.height);
        // If the disposal method is reset to the previous, then copy the previous over the current.
        } else if (disposal === 3) {
          currentContext.clearRect(0, 0, current.width, current.height);
          currentContext.drawImage(previous, 0, 0);
        }
        frame.getImage = () => canvas;
      }
      return frameData;
    };

    const frameDataPromise = gifFrames({
      cumulative: false,
      frames: "all",
      outputType: "canvas",
      url
    }).then((frameData) => renderCumulativeFrames(frameData)) as Promise<any[]>;

    this.loadPromise = frameDataPromise.then((frameData: any[]) => {
      this.frames = frameData.map((frame) => ({
        canvas: frame.getImage() as HTMLCanvasElement,
        delaySeconds: Math.max(frame.frameInfo.delay, 1) / 100
      }));

      for (const frame of this.frames) {
        this.totalTime += frame.delaySeconds;
      }
      this.totalTime = Math.max(this.totalTime, 0.01);
    });
  }

  public getFrameAtTime (time: number): HTMLCanvasElement {
    const clampedTime = time % this.totalTime;
    let seekTime = 0;
    for (let i = 0; i < this.frames.length; ++i) {
      const frame = this.frames[i];
      if (seekTime + frame.delaySeconds > clampedTime) {
        return frame.canvas;
      }
      seekTime += frame.delaySeconds;
    }
    return this.frames[this.frames.length - 1].canvas;
  }
}
