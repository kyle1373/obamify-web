import type {
  SerializedGenerationSettings,
  SerializedUnprocessedPreset,
  SerializedPreset
} from "../lib/domain/serialization";
import type { SeedColor } from "../lib/algorithms/sim-types";
import type { PixelData } from "../lib/algorithms/drawing";

export type ObamifyWorkerCommand =
  | {
      type: "start";
      jobId: string;
      preset: SerializedUnprocessedPreset;
      settings: SerializedGenerationSettings;
    }
  | { type: "cancel"; jobId: string };

export type ObamifyWorkerEvent =
  | { type: "progress"; jobId: string; value: number }
  | { type: "preview"; jobId: string; width: number; height: number; data: Uint8ClampedArray }
  | { type: "assignments"; jobId: string; assignments: number[] }
  | { type: "done"; jobId: string; preset: SerializedPreset }
  | { type: "error"; jobId: string; message: string }
  | { type: "cancelled"; jobId: string };

export type DrawingWorkerCommand =
  | {
      type: "start";
      jobId: string;
      source: SerializedUnprocessedPreset;
      settings: SerializedGenerationSettings;
      colors: SeedColor[];
      pixelData: PixelData[];
      frameCount: number;
    }
  | { type: "cancel"; jobId: string };

export type DrawingWorkerEvent =
  | { type: "assignments"; jobId: string; assignments: number[] }
  | { type: "cancelled"; jobId: string }
  | { type: "error"; jobId: string; message: string };

