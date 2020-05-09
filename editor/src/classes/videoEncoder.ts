import {VideoPlayer} from "./videoPlayer";

export type VideoEncoderProgressCallback = (progress: number) => void;

export interface VideoEncoder {
  initialize(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    video: VideoPlayer,
    onEncoderProgress: VideoEncoderProgressCallback): Promise<void>;
  stop(): Promise<void>;
  processFrame(): Promise<void>;
  getOutputVideo(): Promise<Blob>;
}
