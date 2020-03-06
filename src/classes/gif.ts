import gifFrames from "gif-frames";

export class Gif {
  private readonly frameDataPromise: Promise<any>;

  private totalTime: number;

  public constructor (url: string) {
    this.frameDataPromise = gifFrames({
      frames: "all",
      outputType: "canvas",
      url
    });
  }

  public async getTotalTime (): Promise<number> {
    if (typeof this.totalTime === "undefined") {
      const frameData = await this.frameDataPromise;
      this.totalTime = 0;
      for (const frame of frameData) {
        this.totalTime += frame.frameInfo.delay / 100;
      }
    }
    return Math.max(this.totalTime, 0.01);
  }

  public async getFrameAtTime (time: number): Promise<HTMLCanvasElement> {
    const frameData = await this.frameDataPromise;
    const totalTime = await this.getTotalTime();
    const clampedTime = time % totalTime;
    let seekTime = 0;
    for (let i = 0; i < frameData.length; ++i) {
      const frame = frameData[i];
      const delay = frame.frameInfo.delay / 100;
      if (seekTime + delay > clampedTime) {
        return frame.getImage();
      }
      seekTime += delay;
    }
    return frameData[frameData.length - 1].getImage();
  }
}
