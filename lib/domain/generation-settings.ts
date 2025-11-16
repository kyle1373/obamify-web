import { CropScale } from "./crop-scale";
import { Algorithm } from "./types";
import { loadImageData } from "../image/canvas";
import { loadWeights, uniformWeights } from "../image/weights";

const TARGET_IMAGE_PATH = "/assets/calculate/target256.png";
const TARGET_WEIGHTS_PATH = "/assets/calculate/weights256.png";

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let defaultTargetPromise: Promise<ImageData> | null = null;
let defaultWeightsPromise: Promise<ImageData> | null = null;

async function getDefaultTarget(): Promise<ImageData> {
  if (!defaultTargetPromise) {
    defaultTargetPromise = loadImageData(TARGET_IMAGE_PATH);
  }
  return defaultTargetPromise;
}

async function getDefaultWeights(): Promise<ImageData> {
  if (!defaultWeightsPromise) {
    defaultWeightsPromise = loadImageData(TARGET_WEIGHTS_PATH);
  }
  return defaultWeightsPromise;
}

export interface GenerationSettingsInit {
  id?: string;
  name: string;
  proximityImportance?: number;
  algorithm?: Algorithm;
  sidelen?: number;
  targetCropScale?: CropScale;
  sourceCropScale?: CropScale;
}

export class GenerationSettings {
  id: string;
  name: string;
  proximityImportance: number;
  algorithm: Algorithm;
  sidelen: number;
  targetCropScale: CropScale;
  sourceCropScale: CropScale;
  private customTarget: ImageData | null;

  constructor({
    id = randomId(),
    name,
    proximityImportance = 13,
    algorithm = Algorithm.Genetic,
    sidelen = 128,
    targetCropScale = CropScale.identity(),
    sourceCropScale = CropScale.identity()
  }: GenerationSettingsInit) {
    this.id = id;
    this.name = name;
    this.proximityImportance = proximityImportance;
    this.algorithm = algorithm;
    this.sidelen = sidelen;
    this.targetCropScale = targetCropScale;
    this.sourceCropScale = sourceCropScale;
    this.customTarget = null;
  }

  static default(name: string) {
    return new GenerationSettings({ name });
  }

  async getTarget(): Promise<{ image: ImageData; weights: number[] }> {
    const target = await this.getRawTarget();
    const processed = this.targetCropScale.apply(target, this.sidelen);
    if (this.customTarget) {
      return {
        image: processed,
        weights: uniformWeights(this.sidelen * this.sidelen)
      };
    }
    const defaultWeights = await getDefaultWeights();
    const croppedWeights = this.targetCropScale.apply(defaultWeights, this.sidelen);
    return {
      image: processed,
      weights: loadWeights(croppedWeights)
    };
  }

  async getRawTarget(): Promise<ImageData> {
    if (this.customTarget) {
      return this.customTarget;
    }
    return getDefaultTarget();
  }

  setRawTarget(image: ImageData) {
    this.customTarget = image;
  }

  cloneWithNewId(): GenerationSettings {
    const cloned = new GenerationSettings({
      id: randomId(),
      name: this.nextVersionName(),
      proximityImportance: this.proximityImportance,
      algorithm: this.algorithm,
      sidelen: this.sidelen,
      targetCropScale: this.targetCropScale,
      sourceCropScale: this.sourceCropScale
    });
    cloned.customTarget = this.customTarget;
    return cloned;
  }

  private nextVersionName() {
    const versionMatch = this.name.match(/^(.*) v(\d+)$/);
    if (versionMatch) {
      const [, base, version] = versionMatch;
      return `${base} v${Number(version) + 1}`;
    }
    return `${this.name} v2`;
  }
}

