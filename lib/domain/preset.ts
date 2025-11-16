import { loadImageData } from "../image/canvas";

export interface UnprocessedPreset {
  name: string;
  width: number;
  height: number;
  sourceImg: Uint8ClampedArray;
}

export interface Preset {
  inner: UnprocessedPreset;
  assignments: number[];
}

export interface PresetManifestEntry {
  id: string;
  label: string;
}

const PRESET_MANIFEST_URL = "/presets/index.json";

export async function loadPresetManifest(): Promise<PresetManifestEntry[]> {
  const response = await fetch(PRESET_MANIFEST_URL);
  if (!response.ok) {
    throw new Error("Unable to load preset manifest.");
  }
  const json = (await response.json()) as { presets: PresetManifestEntry[] };
  return json.presets;
}

export async function loadPreset(id: string, label?: string): Promise<Preset> {
  const [assignments, sourceImage] = await Promise.all([
    fetch(`/presets/${id}/assignments.json`).then((r) => {
      if (!r.ok) {
        throw new Error(`Unable to load assignments for preset ${id}`);
      }
      return r.json() as Promise<number[]>;
    }),
    loadImageData(`/presets/${id}/source.png`)
  ]);

  return {
    inner: {
      name: label ?? id,
      width: sourceImage.width,
      height: sourceImage.height,
      sourceImg: new Uint8ClampedArray(sourceImage.data)
    },
    assignments
  };
}

export async function loadAllPresets(): Promise<Preset[]> {
  const manifest = await loadPresetManifest();
  return Promise.all(manifest.map((entry) => loadPreset(entry.id, entry.label)));
}

export function createPresetFromImageData(
  image: ImageData,
  name: string,
  assignments: number[]
): Preset {
  return {
    inner: {
      name,
      width: image.width,
      height: image.height,
      sourceImg: new Uint8ClampedArray(image.data)
    },
    assignments: [...assignments]
  };
}

