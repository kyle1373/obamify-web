import { GenerationSettings } from "../domain/generation-settings";
import { CropScale } from "../domain/crop-scale";
import type { Rgb } from "../domain/types";

const imageDataToRgb = (image: ImageData): Rgb[] => {
  const pixels: Rgb[] = [];
  for (let i = 0; i < image.data.length; i += 4) {
    pixels.push([image.data[i], image.data[i + 1], image.data[i + 2]]);
  }
  return pixels;
};

export interface ImageProcessingResult {
  sourcePixels: Rgb[];
  targetPixels: Rgb[];
  weights: number[];
  sidelen: number;
  sourceImage: ImageData;
  targetImage: ImageData;
}

export async function getImages(
  source: ImageData,
  settings: GenerationSettings
): Promise<ImageProcessingResult> {
  const processedSource = ensureCropScale(settings.sourceCropScale, source, settings.sidelen);
  const { image: target, weights } = await settings.getTarget();
  const targetPixels = imageDataToRgb(target);
  const sourcePixels = imageDataToRgb(processedSource);

  if (sourcePixels.length !== targetPixels.length) {
    throw new Error("Source and target pixels size mismatch.");
  }

  return {
    sourcePixels,
    targetPixels,
    weights,
    sidelen: settings.sidelen,
    sourceImage: processedSource,
    targetImage: target
  };
}

function ensureCropScale(cropScale: CropScale, source: ImageData, sidelen: number) {
  return cropScale.apply(source, sidelen);
}

