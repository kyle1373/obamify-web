import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto
  });
}

if (typeof ImageData === "undefined") {
  class NodeImageData implements ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: PredefinedColorSpace = "srgb";
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  }
  // @ts-expect-error
  globalThis.ImageData = NodeImageData;
}

