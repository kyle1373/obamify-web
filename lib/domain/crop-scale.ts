import { createCanvas, getContext2D } from "../image/canvas";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export class CropScale {
  constructor(public x = 0, public y = 0, public scale = 1) {}

  static identity() {
    return new CropScale(0, 0, 1);
  }

  apply(image: ImageData, sidelen: number): ImageData {
    const width = image.width;
    const height = image.height;
    const baseSide = Math.min(width, height);
    const normalizedScale = Math.max(1, this.scale);
    const cropSide = Math.min(
      Math.max(1, Math.floor(baseSide / normalizedScale)),
      width,
      height
    );

    const maxXOff = Math.max(0, width - cropSide);
    const maxYOff = Math.max(0, height - cropSide);

    const xn = (clamp(this.x, -1, 1) + 1) * 0.5;
    const yn = (clamp(this.y, -1, 1) + 1) * 0.5;

    const x0 = Math.floor(xn * maxXOff);
    const y0 = Math.floor(yn * maxYOff);

    const sourceCanvas = createCanvas(width, height);
    const sourceCtx = getContext2D(sourceCanvas);
    sourceCtx.putImageData(image, 0, 0);

    const cropCanvas = createCanvas(cropSide, cropSide);
    const cropCtx = getContext2D(cropCanvas);
    cropCtx.drawImage(
      sourceCanvas as CanvasImageSource,
      x0,
      y0,
      cropSide,
      cropSide,
      0,
      0,
      cropSide,
      cropSide
    );

    if (cropSide === sidelen) {
      return cropCtx.getImageData(0, 0, cropSide, cropSide);
    }

    const scaledCanvas = createCanvas(sidelen, sidelen);
    const scaledCtx = getContext2D(scaledCanvas);
    scaledCtx.drawImage(
      cropCanvas as CanvasImageSource,
      0,
      0,
      cropSide,
      cropSide,
      0,
      0,
      sidelen,
      sidelen
    );
    return scaledCtx.getImageData(0, 0, sidelen, sidelen);
  }
}

