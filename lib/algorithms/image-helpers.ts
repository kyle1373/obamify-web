import type { Rgb } from "../domain/types";

export function assignmentsToImageData(
  pixels: Rgb[],
  assignments: number[],
  sidelen: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(sidelen * sidelen * 4);
  assignments.forEach((sourceIdx, targetIdx) => {
    const [r, g, b] = pixels[sourceIdx];
    const base = targetIdx * 4;
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = 255;
  });
  return data;
}

