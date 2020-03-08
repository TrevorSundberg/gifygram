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
    const frameDataPromise = gifFrames({
      cumulative: false,
      frames: "all",
      outputType: "canvas",
      url
    }) as Promise<any[]>;

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
