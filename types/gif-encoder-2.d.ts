declare module "gif-encoder-2" {
  export default class GIFEncoder {
    constructor(
      width: number,
      height: number,
      algorithm?: "neuquant" | "octree",
      useTypedArray?: boolean
    );
    start(): void;
    finish(): void;
    setDelay(ms: number): void;
    setRepeat(repeat: number): void;
    addFrame(data: Uint8ClampedArray | Buffer): void;
    readonly out: { getData(): Uint8Array };
  }
}

