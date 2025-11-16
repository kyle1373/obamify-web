import type { Preset, UnprocessedPreset } from "../domain/preset";
import type { SeedPos, SeedColor } from "./sim-types";
import { DRAWING_CANVAS_SIZE } from "./drawing";

const PERSONAL_SPACE = 0.95;
const MAX_VELOCITY = 6;
const ALIGNMENT_FACTOR = 0.8;

const factorCurve = (x: number) => Math.min(x * x * x, 1000);

export class CellBody {
  velx = 0;
  vely = 0;
  accx = 0;
  accy = 0;
  dstForce: number;
  age = 0;
  strokeId = 0;

  constructor(
    public srcx: number,
    public srcy: number,
    public dstx: number,
    public dsty: number,
    dstForce: number
  ) {
    this.dstForce = dstForce;
  }

  update(pos: SeedPos) {
    this.velx += this.accx;
    this.vely += this.accy;

    this.accx = 0;
    this.accy = 0;

    this.velx *= 0.97;
    this.vely *= 0.97;

    pos.xy[0] += clamp(this.velx, -MAX_VELOCITY, MAX_VELOCITY);
    pos.xy[1] += clamp(this.vely, -MAX_VELOCITY, MAX_VELOCITY);

    this.age += 1;
  }

  applyDstForce(pos: SeedPos, sidelen: number) {
    const elapsed = this.age / 60;
    const factor = this.dstForce === 0 ? 0.1 : factorCurve(elapsed * this.dstForce);
    const dx = this.dstx - pos.xy[0];
    const dy = this.dsty - pos.xy[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      return;
    }
    this.accx += (dx * dist * factor) / sidelen;
    this.accy += (dy * dist * factor) / sidelen;
  }

  applyNeighbourForce(pos: SeedPos, other: SeedPos, pixelSize: number) {
    const dx = other.xy[0] - pos.xy[0];
    const dy = other.xy[1] - pos.xy[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const personalSpace = pixelSize * PERSONAL_SPACE;
    const weight = (1 / Math.max(dist, 1e-5)) * (personalSpace - dist) / personalSpace;

    if (dist > 0 && dist < personalSpace) {
      this.accx -= dx * weight;
      this.accy -= dy * weight;
    } else if (Math.abs(dist) < Number.EPSILON) {
      const seed = pos.xy[0] + pos.xy[1] * 9973;
      const randomX = pseudoRandom(seed);
      const randomY = pseudoRandom(seed * 3.123);
      this.accx += (randomX - 0.5) * 0.1;
      this.accy += (randomY - 0.5) * 0.1;
    }

    return Math.max(0, weight);
  }

  applyWallForce(pos: SeedPos, sidelen: number, pixelSize: number) {
    const personalSpace = pixelSize * PERSONAL_SPACE * 0.5;
    if (pos.xy[0] < personalSpace) {
      this.accx += (personalSpace - pos.xy[0]) / personalSpace;
    } else if (pos.xy[0] > sidelen - personalSpace) {
      this.accx -= (pos.xy[0] - (sidelen - personalSpace)) / personalSpace;
    }

    if (pos.xy[1] < personalSpace) {
      this.accy += (personalSpace - pos.xy[1]) / personalSpace;
    } else if (pos.xy[1] > sidelen - personalSpace) {
      this.accy -= (pos.xy[1] - (sidelen - personalSpace)) / personalSpace;
    }
  }

  applyStrokeAttraction(i: SeedPos, other: SeedPos, weight: number) {
    this.accx += (other.xy[0] - i.xy[0]) * weight * 0.8;
    this.accy += (other.xy[1] - i.xy[1]) * weight * 0.8;
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export class Sim {
  cells: CellBody[] = [];
  reversed = false;

  constructor(private readonly simName: string) {}

  name() {
    return this.simName;
  }

  switch() {
    for (const cell of this.cells) {
      const tmpx = cell.srcx;
      cell.srcx = cell.dstx;
      cell.dstx = tmpx;
      const tmpy = cell.srcy;
      cell.srcy = cell.dsty;
      cell.dsty = tmpy;
      cell.age = 0;
    }
    this.reversed = !this.reversed;
  }

  update(positions: SeedPos[], sidelen: number) {
    const gridSize = Math.sqrt(this.cells.length);
    const gridSide = Math.max(1, Math.round(gridSize));
    const pixelSize = sidelen / gridSide;
    const grid: number[][] = Array.from({ length: gridSide * gridSide }, () => []);

    positions.forEach((pos, i) => {
      const x = Math.floor(clamp(pos.xy[0] / pixelSize, 0, gridSize - 1));
      const y = Math.floor(clamp(pos.xy[1] / pixelSize, 0, gridSize - 1));
      const index = y * gridSide + x;
      const idx = Math.max(0, Math.min(grid.length - 1, Math.floor(index)));
      grid[idx]?.push(i);
    });

    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].applyWallForce(positions[i], sidelen, pixelSize);
      this.cells[i].applyDstForce(positions[i], sidelen);
    }

    for (let i = 0; i < this.cells.length; i++) {
      const pos = positions[i];
      const col = Math.floor(pos.xy[0] / pixelSize);
      const row = Math.floor(pos.xy[1] / pixelSize);
      let avgXVel = 0;
      let avgYVel = 0;
      let count = 0;
      for (let dy = 0; dy <= 2; dy++) {
        for (let dx = 0; dx <= 2; dx++) {
          if (
            col + dx === 0 ||
            row + dy === 0 ||
            col + dx >= gridSide ||
            row + dy >= gridSide
          ) {
            continue;
          }
          const ncol = col + dx - 1;
          const nrow = row + dy - 1;
          const nindex = nrow * gridSide + ncol;
          const bucket = grid[nindex] ?? [];
          for (const other of bucket) {
            if (other === i) {
              continue;
            }
            const otherPos = positions[other];
            const weight = this.cells[i].applyNeighbourForce(pos, otherPos, pixelSize);
            if (this.cells[i].strokeId === this.cells[other].strokeId) {
              this.cells[i].applyStrokeAttraction(pos, otherPos, weight);
            }
            avgXVel += this.cells[other].velx * weight;
            avgYVel += this.cells[other].vely * weight;
            count += weight;
          }
        }
      }

      if (count > 0) {
        avgXVel /= count;
        avgYVel /= count;
        this.cells[i].accx += (avgXVel - this.cells[i].velx) * ALIGNMENT_FACTOR;
        this.cells[i].accy += (avgYVel - this.cells[i].vely) * ALIGNMENT_FACTOR;
      }
    }

    this.cells.forEach((cell, idx) => {
      cell.update(positions[idx]);
    });
  }

  setAssignments(assignments: number[], sidelen: number) {
    const width = Math.max(1, Math.round(Math.sqrt(this.cells.length)));
    const pixelSize = sidelen / width;
    assignments.forEach((srcIdx, dstIdx) => {
      const srcX = srcIdx % width;
      const srcY = Math.floor(srcIdx / width);
      const dstX = dstIdx % width;
      const dstY = Math.floor(dstIdx / width);
      const prev = this.cells[srcIdx];
      this.cells[srcIdx] = new CellBody(
        (srcX + 0.5) * pixelSize,
        (srcY + 0.5) * pixelSize,
        (dstX + 0.5) * pixelSize,
        (dstY + 0.5) * pixelSize,
        prev.dstForce
      );
      this.cells[srcIdx].age = prev.age;
      this.cells[srcIdx].strokeId = prev.strokeId;
    });
  }

  preparePlay(positions: SeedPos[], reverse: boolean) {
    if (this.reversed === reverse) {
      this.cells.forEach((cell, i) => {
        positions[i].xy[0] = cell.srcx;
        positions[i].xy[1] = cell.srcy;
        cell.age = 0;
      });
    } else {
      this.cells.forEach((cell, i) => {
        positions[i].xy[0] = cell.dstx;
        positions[i].xy[1] = cell.dsty;
      });
      this.switch();
    }
  }
}

export function initImage(sidelen: number, preset: Preset) {
  const sourceImage = new ImageData(preset.inner.sourceImg, preset.inner.width, preset.inner.height);
  const { seeds, colors, seedsN } = initColors(sidelen, sourceImage);
  const sim = new Sim(preset.inner.name);
  sim.cells = Array.from({ length: seedsN }, () => new CellBody(0, 0, 0, 0, 0.13));
  sim.setAssignments(preset.assignments, sidelen);
  return { seedCount: seedsN, seeds, colors, sim };
}

export function initCanvas(sidelen: number, source: UnprocessedPreset) {
  const sourceImage = new ImageData(source.sourceImg, source.width, source.height);
  const assignments = Array.from(
    { length: DRAWING_CANVAS_SIZE * DRAWING_CANVAS_SIZE },
    (_, i) => i
  );
  const { seeds, colors, seedsN } = initColors(sidelen, sourceImage);
  const sim = new Sim(source.name);
  sim.cells = Array.from({ length: seedsN }, () => new CellBody(0, 0, 0, 0, 0.13));
  sim.setAssignments(assignments, sidelen);
  return { seedCount: seedsN, seeds, colors, sim };
}

function initColors(sidelen: number, image: ImageData) {
  const seeds: SeedPos[] = [];
  const colors: SeedColor[] = [];
  const width = image.width;
  const height = image.height;
  if (width !== height) {
    throw new Error("Source image must be square.");
  }
  const pixelsize = sidelen / width;
  const data = image.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      seeds.push({
        xy: [(x + 0.5) * pixelsize, (y + 0.5) * pixelsize]
      });
      colors.push({
        rgba: [
          data[idx] / 255,
          data[idx + 1] / 255,
          data[idx + 2] / 255,
          1
        ]
      });
    }
  }
  return { seeds, colors, seedsN: seeds.length };
}

