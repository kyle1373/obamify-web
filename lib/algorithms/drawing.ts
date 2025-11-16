import type { GenerationSettings } from "../domain/generation-settings";
import type { UnprocessedPreset } from "../domain/preset";
import type { ProgressSink } from "../domain/types";
import { getImages } from "../image/get-images";
import { heuristic, SWAPS_PER_GENERATION_PER_PIXEL } from "./heuristics";
import { RNG } from "./rng";
import type { SeedColor } from "./sim-types";

export interface PixelData {
  strokeId: number;
  lastEdited: number;
}

export const DRAWING_CANVAS_SIZE = 128;
const STROKE_REWARD = -10_000_000_000;

type Rgb = [number, number, number];

class DrawingPixel {
  h: number;
  constructor(
    public srcX: number,
    public srcY: number,
    heuristicValue: number
  ) {
    this.h = heuristicValue;
  }

  calcHeuristic(
    targetPos: [number, number],
    targetCol: Rgb,
    weight: number,
    colors: SeedColor[],
    proximityImportance: number
  ) {
    const rgba = colors[this.srcY * DRAWING_CANVAS_SIZE + this.srcX]?.rgba ?? [0, 0, 0, 1];
    const rgb: Rgb = [
      Math.min(255, Math.round(rgba[0] * 256)),
      Math.min(255, Math.round(rgba[1] * 256)),
      Math.min(255, Math.round(rgba[2] * 256))
    ];
    return heuristic(
      [this.srcX, this.srcY],
      targetPos,
      rgb,
      targetCol,
      weight,
      proximityImportance
    );
  }

  updateHeuristic(value: number) {
    this.h = value;
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const computeMaxDist = (age: number) => {
  const base = DRAWING_CANVAS_SIZE / 4;
  return Math.round(base * Math.pow(0.99, Math.floor(age / 30)));
};

const strokeReward = (
  newPos: number,
  oldPos: number,
  pixelData: PixelData[],
  pixels: DrawingPixel[],
  frameCount: number
) => {
  const srcIndex =
    pixels[oldPos].srcX + pixels[oldPos].srcY * DRAWING_CANVAS_SIZE;
  const data = pixelData[srcIndex];
  if (!data) {
    return 0;
  }
  const strokeId = data.strokeId;
  const _age = frameCount - data.lastEdited;
  void _age;

  const x = newPos % DRAWING_CANVAS_SIZE;
  const y = Math.floor(newPos / DRAWING_CANVAS_SIZE);

  const neighbors: Array<[number, number]> = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1]
  ];

  for (const [dx, dy] of neighbors) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= DRAWING_CANVAS_SIZE || ny < 0 || ny >= DRAWING_CANVAS_SIZE) {
      continue;
    }
    const npos = ny * DRAWING_CANVAS_SIZE + nx;
    const nsrc =
      pixels[npos].srcX + pixels[npos].srcY * DRAWING_CANVAS_SIZE;
    if (pixelData[nsrc]?.strokeId === strokeId) {
      return STROKE_REWARD;
    }
  }

  return 0;
};

export interface DrawingProcessOptions {
  colors: SeedColor[];
  pixelData: PixelData[];
  frameCount: number;
  signal?: AbortSignal;
}

export function initPixelData(frameCount: number): PixelData[] {
  return Array.from({ length: DRAWING_CANVAS_SIZE * DRAWING_CANVAS_SIZE }, () => ({
    strokeId: 0,
    lastEdited: frameCount
  }));
}

export async function drawingProcessGenetic(
  source: UnprocessedPreset,
  settings: GenerationSettings,
  sink: ProgressSink<number[]>,
  { colors, pixelData, frameCount, signal }: DrawingProcessOptions
): Promise<void> {
  const sourceImage = new ImageData(source.sourceImg, source.width, source.height);
  const { targetPixels, weights, sidelen } = await getImages(sourceImage, settings);

  const pixels = targetPixels.map((_, index) => {
    const x = index % sidelen;
    const y = Math.floor(index / sidelen);
    const px = new DrawingPixel(x, y, 0);
    const h = px.calcHeuristic(
      [x, y],
      targetPixels[index],
      weights[index],
      colors,
      settings.proximityImportance
    );
    px.updateHeuristic(h + STROKE_REWARD);
    return px;
  });

  const rng = new RNG(12345);
  const swapsPerGeneration = SWAPS_PER_GENERATION_PER_PIXEL * pixels.length;

  while (true) {
    let swapsMade = 0;
    const colorsSnapshot = [...colors];
    const pixelSnapshot = [...pixelData];

    for (let i = 0; i < swapsPerGeneration; i++) {
      const apos = rng.int(pixels.length);
      const ax = apos % sidelen;
      const ay = Math.floor(apos / sidelen);
      const ageA = Math.max(0, frameCount - (pixelSnapshot[apos]?.lastEdited ?? 0));
      const maxDistA = Math.max(1, computeMaxDist(ageA));

      const bx = clamp(
        ax + rng.range(-maxDistA, maxDistA + 1),
        0,
        Math.max(0, sidelen - 1)
      );
      const by = clamp(
        ay + rng.range(-maxDistA, maxDistA + 1),
        0,
        Math.max(0, sidelen - 1)
      );
      const bpos = by * sidelen + bx;

      const ageB = Math.max(0, frameCount - (pixelSnapshot[bpos]?.lastEdited ?? 0));
      const maxDistB = Math.max(1, computeMaxDist(ageB));
      if (Math.abs(bx - ax) > maxDistB || Math.abs(by - ay) > maxDistB) {
        continue;
      }

      const targetA = targetPixels[apos];
      const targetB = targetPixels[bpos];

      const aOnB =
        pixels[apos].calcHeuristic(
          [bx, by],
          targetB,
          weights[bpos],
          colorsSnapshot,
          settings.proximityImportance
        ) + strokeReward(bpos, apos, pixelSnapshot, pixels, frameCount);

      const bOnA =
        pixels[bpos].calcHeuristic(
          [ax, ay],
          targetA,
          weights[apos],
          colorsSnapshot,
          settings.proximityImportance
        ) + strokeReward(apos, bpos, pixelSnapshot, pixels, frameCount);

      const improvement = pixels[apos].h - bOnA + (pixels[bpos].h - aOnB);
      if (improvement > 0) {
        const temp = pixels[apos];
        pixels[apos] = pixels[bpos];
        pixels[bpos] = temp;
        pixels[apos].updateHeuristic(bOnA);
        pixels[bpos].updateHeuristic(aOnB);
        swapsMade += 1;
      }
    }

    if (signal?.aborted) {
      sink({ type: "cancelled" });
      return;
    }

    if (swapsMade > 0) {
      const assignments = pixels.map((p) => p.srcY * sidelen + p.srcX);
      sink({ type: "assignments", assignments });
    }
  }
}

