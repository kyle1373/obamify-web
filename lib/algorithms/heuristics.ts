import type { Rgb } from "../domain/types";

export const SWAPS_PER_GENERATION_PER_PIXEL = 128;

export function heuristic(
  apos: [number, number],
  bpos: [number, number],
  a: Rgb,
  b: Rgb,
  colorWeight: number,
  spatialWeight: number
): number {
  const spatial =
    (apos[0] - bpos[0]) * (apos[0] - bpos[0]) +
    (apos[1] - bpos[1]) * (apos[1] - bpos[1]);
  const color =
    (a[0] - b[0]) * (a[0] - b[0]) +
    (a[1] - b[1]) * (a[1] - b[1]) +
    (a[2] - b[2]) * (a[2] - b[2]);
  return color * colorWeight + Math.pow(spatial * spatialWeight, 2);
}

