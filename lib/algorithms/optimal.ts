import type { ProgressSink } from "../domain/types";
import type { UnprocessedPreset, Preset } from "../domain/preset";
import { getImages } from "../image/get-images";
import { heuristic } from "./heuristics";
import { assignmentsToImageData } from "./image-helpers";
import type { GenerationSettings } from "../domain/generation-settings";

interface ImgDiffWeights {
  rows(): number;
  columns(): number;
  at(row: number, col: number): number;
}

class ImageWeights implements ImgDiffWeights {
  constructor(
    private source: [number, number, number][],
    private target: [number, number, number][],
    private weights: number[],
    private sidelen: number,
    private proximityImportance: number
  ) {}

  rows() {
    return this.target.length;
  }

  columns() {
    return this.source.length;
  }

  at(row: number, col: number) {
    const x1 = row % this.sidelen;
    const y1 = Math.floor(row / this.sidelen);
    const x2 = col % this.sidelen;
    const y2 = Math.floor(col / this.sidelen);
    const [r1, g1, b1] = this.target[row];
    const [r2, g2, b2] = this.source[col];
    const weight = this.weights[row];
    return (
      -heuristic([x1, y1], [x2, y2], [r1, g1, b1], [r2, g2, b2], weight, this.proximityImportance)
    );
  }
}

interface OptimalOptions {
  signal?: AbortSignal;
}

export async function processOptimal(
  unprocessed: UnprocessedPreset,
  settings: GenerationSettings,
  sink: ProgressSink<Preset>,
  { signal }: OptimalOptions = {}
): Promise<Preset> {
  const sourceImage = new ImageData(unprocessed.sourceImg, unprocessed.width, unprocessed.height);
  const { sourcePixels, targetPixels, weights, sidelen, sourceImage: processedSource } =
    await getImages(sourceImage, settings);

  const weightMatrix = new ImageWeights(
    sourcePixels,
    targetPixels,
    weights,
    sidelen,
    settings.proximityImportance
  );

  const assignments = executeHungarian(weightMatrix, sink, signal, sidelen, sourcePixels);

  const preset: Preset = {
    inner: {
      name: unprocessed.name,
      width: processedSource.width,
      height: processedSource.height,
      sourceImg: new Uint8ClampedArray(processedSource.data)
    },
    assignments
  };

  sink({ type: "done", payload: preset });
  return preset;
}

function executeHungarian(
  weights: ImgDiffWeights,
  sink: ProgressSink<Preset>,
  signal: AbortSignal | undefined,
  sidelen: number,
  sourcePixels: [number, number, number][]
) {
  const nx = weights.rows();
  const ny = weights.columns();
  if (nx > ny) {
    throw new Error("Number of rows must not exceed number of columns.");
  }

  const xy: Array<number | null> = Array(nx).fill(null);
  const yx: Array<number | null> = Array(ny).fill(null);
  const lx = Array(nx)
    .fill(0)
    .map((_, row) => {
      let max = -Infinity;
      for (let col = 0; col < ny; col++) {
        max = Math.max(max, weights.at(row, col));
      }
      return max;
    });
  const ly = Array(ny).fill(0);
  const alternating: Array<number | null> = Array(ny).fill(null);
  const slack = Array(ny).fill(0);
  const slackx = Array(ny).fill(0);
  const queue = new Set<number>();

  for (let root = 0; root < nx; root++) {
    alternating.fill(null);
    queue.clear();
    queue.add(root);

    for (let y = 0; y < ny; y++) {
      slack[y] = lx[root] + ly[y] - weights.at(root, y);
      slackx[y] = root;
    }

    let targetY: number | null = null;

    while (targetY === null) {
      let delta = Number.POSITIVE_INFINITY;
      let selX = 0;
      let selY = 0;

      for (let y = 0; y < ny; y++) {
        if (alternating[y] === null && slack[y] < delta) {
          delta = slack[y];
          selX = slackx[y];
          selY = y;
        }
      }

      if (!Number.isFinite(delta)) {
        break;
      }

      if (delta > 0) {
        queue.forEach((x) => {
          lx[x] -= delta;
        });
        for (let y = 0; y < ny; y++) {
          if (alternating[y] !== null) {
            ly[y] += delta;
          } else {
            slack[y] -= delta;
          }
        }
      }

      alternating[selY] = selX;

      if (yx[selY] === null) {
        targetY = selY;
        break;
      }

      const matchedX = yx[selY]!;
      queue.add(matchedX);
      for (let y = 0; y < ny; y++) {
        if (alternating[y] === null) {
          const alternateSlack = lx[matchedX] + ly[y] - weights.at(matchedX, y);
          if (slack[y] > alternateSlack) {
            slack[y] = alternateSlack;
            slackx[y] = matchedX;
          }
        }
      }
    }

    while (targetY !== null) {
      const x = alternating[targetY]!;
      const prev = xy[x];
      xy[x] = targetY;
      yx[targetY] = x;
      targetY = prev;
    }

    if (root % 100 === 0) {
      if (signal?.aborted) {
        sink({ type: "cancelled" });
        throw new Error("Processing cancelled");
      }

      sink({ type: "progress", value: root / nx });

      const interimAssignments = xy.map((y) => y ?? 0);
      const previewData = assignmentsToImageData(sourcePixels, interimAssignments, sidelen);
      sink({
        type: "preview",
        width: sidelen,
        height: sidelen,
        data: previewData
      });
    }
  }

  return xy.map((y) => y ?? 0);
}

