import GIFEncoder from "gif-encoder-2";

export const GIF_FRAMERATE = 8;
export const GIF_RESOLUTION = 400;
export const GIF_MAX_FRAMES = 140;
export const GIF_MIN_FRAMES = 100;
export const GIF_MAX_SIZE = 10 * 1024 * 1024;
export const GIF_SPEED = 1.5;

export type GifStatus =
  | { type: "idle" }
  | { type: "recording" }
  | { type: "complete"; data: Uint8Array }
  | { type: "error"; message: string };

export interface GifRecorderOptions {
  resolution?: number;
  framerate?: number;
  speed?: number;
  maxFrames?: number;
}

export class GifRecorder {
  private encoder: GIFEncoder | null = null;
  private frameCount = 0;
  private buffers: Uint8Array[] = [];
  private status: GifStatus = { type: "idle" };
  private options: Required<GifRecorderOptions>;

  constructor(options: GifRecorderOptions = {}) {
    this.options = {
      resolution: options.resolution ?? GIF_RESOLUTION,
      framerate: options.framerate ?? GIF_FRAMERATE,
      speed: options.speed ?? GIF_SPEED,
      maxFrames: options.maxFrames ?? GIF_MAX_FRAMES
    };
  }

  start() {
    const { resolution, framerate } = this.options;
    this.encoder = new GIFEncoder(resolution, resolution, "neuquant", true);
    this.encoder.start();
    this.encoder.setRepeat(0);
    this.encoder.setDelay((1000 / framerate) * (1 / this.options.speed));
    this.buffers = [];
    this.frameCount = 0;
    this.status = { type: "recording" };
  }

  addFrame(rgba: Uint8ClampedArray) {
    if (!this.encoder || this.status.type !== "recording") {
      throw new Error("Recorder is not active.");
    }
    this.encoder.addFrame(rgba);
    this.frameCount += 1;

    if (this.frameCount >= this.options.maxFrames) {
      this.finish();
    }
  }

  finish() {
    if (!this.encoder) {
      return;
    }
    this.encoder.finish();
    const stream = this.encoder.out.getData();
    const data = new Uint8Array(stream);
    if (data.byteLength > GIF_MAX_SIZE) {
      this.status = {
        type: "error",
        message: "GIF exceeded maximum size."
      };
    } else if (this.frameCount < GIF_MIN_FRAMES) {
      this.status = {
        type: "error",
        message: "Not enough frames to build a smooth GIF."
      };
    } else {
      this.status = { type: "complete", data };
      this.buffers.push(data);
    }
    this.encoder = null;
  }

  stop() {
    this.encoder = null;
    this.frameCount = 0;
    this.status = { type: "idle" };
    this.buffers = [];
  }

  getStatus() {
    return this.status;
  }

  getFrames() {
    return this.buffers.slice();
  }
}

