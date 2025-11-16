type CanvasLike =
  | HTMLCanvasElement
  | OffscreenCanvas
  | { width: number; height: number; getContext: (type: "2d") => CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null };

type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function ensureCanvasConstructor(): {
  create(width: number, height: number): CanvasLike;
} {
  if (typeof OffscreenCanvas !== "undefined") {
    return {
      create: (width, height) => new OffscreenCanvas(width, height)
    };
  }
  if (typeof document !== "undefined") {
    return {
      create: (width, height) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
      }
    };
  }
  throw new Error("Canvas API is not available in this environment.");
}

const canvasFactory = ensureCanvasConstructor();

export function createCanvas(width: number, height: number): CanvasLike {
  return canvasFactory.create(width, height);
}

export function getContext2D(canvas: CanvasLike): CanvasContext {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire 2D canvas context.");
  }
  return ctx;
}

export function imageBitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = createCanvas(bitmap.width, bitmap.height);
  const ctx = getContext2D(canvas);
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

export async function loadImageData(url: string): Promise<ImageData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load image at ${url}`);
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    return imageBitmapToImageData(bitmap);
  } finally {
    bitmap.close();
  }
}

export async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    return imageBitmapToImageData(bitmap);
  } finally {
    bitmap.close();
  }
}

export function cloneImageData(source: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
}

export function ensureImageData(image: ImageData | ImageBitmap): ImageData {
  if (image instanceof ImageData) {
    return image;
  }
  return imageBitmapToImageData(image);
}

