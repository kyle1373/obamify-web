import type { Preset } from "../domain/preset";
import { withStore } from "./indexed-db";

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export interface StoredPresetMeta {
  id: string;
  name: string;
  createdAt: number;
}

interface StoredPresetRecord extends StoredPresetMeta {
  preset: Preset;
}

export async function savePresetToStore(preset: Preset): Promise<StoredPresetMeta> {
  const record: StoredPresetRecord = {
    id: randomId(),
    name: preset.inner.name,
    createdAt: Date.now(),
    preset
  };
  await withStore("readwrite", (store) => store.put(record));
  return record;
}

export async function listStoredPresets(): Promise<StoredPresetMeta[]> {
  const records = (await withStore("readonly", (store) => store.getAll())) as StoredPresetRecord[];
  return records
    .map(({ id, name, createdAt }) => ({ id, name, createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadStoredPreset(id: string): Promise<Preset | null> {
  const record = (await withStore("readonly", (store) => store.get(id))) as StoredPresetRecord | undefined;
  return record?.preset ?? null;
}

export async function deleteStoredPreset(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}

