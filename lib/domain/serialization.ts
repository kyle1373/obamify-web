import { CropScale } from "./crop-scale";
import { GenerationSettings } from "./generation-settings";
import type { UnprocessedPreset, Preset } from "./preset";
import { Algorithm } from "./types";

export interface SerializedCropScale {
  x: number;
  y: number;
  scale: number;
}

export interface SerializedGenerationSettings {
  id: string;
  name: string;
  proximityImportance: number;
  algorithm: Algorithm;
  sidelen: number;
  targetCropScale: SerializedCropScale;
  sourceCropScale: SerializedCropScale;
}

const serializeCropScale = (scale: CropScale): SerializedCropScale => ({
  x: scale.x,
  y: scale.y,
  scale: scale.scale
});

export const serializeGenerationSettings = (
  settings: GenerationSettings
): SerializedGenerationSettings => ({
  id: settings.id,
  name: settings.name,
  proximityImportance: settings.proximityImportance,
  algorithm: settings.algorithm,
  sidelen: settings.sidelen,
  targetCropScale: serializeCropScale(settings.targetCropScale),
  sourceCropScale: serializeCropScale(settings.sourceCropScale)
});

export const deserializeGenerationSettings = (
  data: SerializedGenerationSettings
): GenerationSettings =>
  new GenerationSettings({
    id: data.id,
    name: data.name,
    proximityImportance: data.proximityImportance,
    algorithm: data.algorithm,
    sidelen: data.sidelen,
    targetCropScale: new CropScale(
      data.targetCropScale.x,
      data.targetCropScale.y,
      data.targetCropScale.scale
    ),
    sourceCropScale: new CropScale(
      data.sourceCropScale.x,
      data.sourceCropScale.y,
      data.sourceCropScale.scale
    )
  });

export type SerializedPreset = Preset;
export type SerializedUnprocessedPreset = UnprocessedPreset;

