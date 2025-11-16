import type { ProgressSink } from "../domain/types";
import type { UnprocessedPreset, Preset } from "../domain/preset";
import type { GenerationSettings } from "../domain/generation-settings";
import { getImages } from "../image/get-images";
import { heuristic, SWAPS_PER_GENERATION_PER_PIXEL } from "./heuristics";
import { assignmentsToImageData } from "./image-helpers";
import { RNG } from "./rng";

type Rgb = [number, number, number];

class Pixel {
  h: number;
  constructor(
    public srcX: number,
    public srcY: number,
    public rgb: Rgb,
    heuristicValue: number
  ) {
    this.h = heuristicValue;
  }

  calcHeuristic(
    targetPos: [number, number],
    targetCol: Rgb,
    weight: number,
    proximityImportance: number
  ) {
    return heuristic(
      [this.srcX, this.srcY],
      targetPos,
      this.rgb,
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

interface GeneticOptions {
  signal?: AbortSignal;
}

export async function processGenetic(
  unprocessed: UnprocessedPreset,
  settings: GenerationSettings,
  sink: ProgressSink<Preset>,
  { signal }: GeneticOptions = {}
): Promise<Preset> {
  const sourceImage = new ImageData(unprocessed.sourceImg, unprocessed.width, unprocessed.height);
  const {
    sourcePixels,
    targetPixels,
    weights,
    sidelen,
    sourceImage: processedSource
  } = await getImages(sourceImage, settings);

  const pixels = sourcePixels.map((rgb, index) => {
    const x = index % sidelen;
    const y = Math.floor(index / sidelen);
    const pixel = new Pixel(x, y, rgb, 0);
    const h = pixel.calcHeuristic(
      [x, y],
      targetPixels[index],
      weights[index],
      settings.proximityImportance
    );
    pixel.updateHeuristic(h);
    return pixel;
  });

  const rng = new RNG(12345);
  const swapsPerGeneration = SWAPS_PER_GENERATION_PER_PIXEL * pixels.length;
  let maxDist = settings.sidelen;

  while (true) {
    let swapsMade = 0;
    for (let i = 0; i < swapsPerGeneration; i++) {
      const apos = rng.int(pixels.length);
      const ax = apos % sidelen;
      const ay = Math.floor(apos / sidelen);

      const bx = clamp(
        ax + rng.range(-maxDist, maxDist + 1),
        0,
        Math.max(0, sidelen - 1)
      );
      const by = clamp(
        ay + rng.range(-maxDist, maxDist + 1),
        0,
        Math.max(0, sidelen - 1)
      );
      const bpos = by * sidelen + bx;

      const targetA = targetPixels[apos];
      const targetB = targetPixels[bpos];

      const aOnB = pixels[apos].calcHeuristic(
        [bx, by],
        targetB,
        weights[bpos],
        settings.proximityImportance
      );
      const bOnA = pixels[bpos].calcHeuristic(
        [ax, ay],
        targetA,
        weights[apos],
        settings.proximityImportance
      );

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
      throw new Error("Processing cancelled");
    }

    const assignments = pixels.map((p) => p.srcY * sidelen + p.srcX);

    if (maxDist < 4 && swapsMade < 10) {
      const preset: Preset = {
        inner: {
          name: unprocessed.name,
          width: processedSource.width,
          height: processedSource.height,
          sourceImg: new Uint8ClampedArray(processedSource.data)
        },
        assignments: [...assignments]
      };
      sink({ type: "done", payload: preset });
      return preset;
    }

    const preview = assignmentsToImageData(sourcePixels, assignments, sidelen);
    sink({
      type: "preview",
      width: sidelen,
      height: sidelen,
      data: preview
    });
    sink({
      type: "progress",
      value: 1 - maxDist / settings.sidelen
    });

    maxDist = Math.max(2, Math.floor(maxDist * 0.99));
  }
}

