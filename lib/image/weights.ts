import { CropScale } from "../domain/crop-scale";

export function loadWeights(image: ImageData): number[] {
  const weights = new Array(image.width * image.height);
  const data = image.data;
  for (let i = 0; i < weights.length; i++) {
    weights[i] = data[i * 4];
  }
  return weights;
}

export function uniformWeights(length: number, value = 255): number[] {
  return Array.from({ length }, () => value);
}

export function applyCropScale(image: ImageData, cropScale: CropScale, sidelen: number) {
  return cropScale.apply(image, sidelen);
}

