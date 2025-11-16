import type { UnprocessedPreset, Preset } from "../domain/preset";
import type { GenerationSettings } from "../domain/generation-settings";
import type { ProgressSink } from "../domain/types";
import { Algorithm } from "../domain/types";
import { processOptimal } from "./optimal";
import { processGenetic } from "./genetic";

interface ProcessOptions {
  signal?: AbortSignal;
}

export async function processPreset(
  unprocessed: UnprocessedPreset,
  settings: GenerationSettings,
  sink: ProgressSink<Preset>,
  options: ProcessOptions = {}
) {
  if (settings.algorithm === Algorithm.Optimal) {
    return processOptimal(unprocessed, settings, sink, options);
  }
  return processGenetic(unprocessed, settings, sink, options);
}

