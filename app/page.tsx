"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenerationSettings } from "../lib/domain/generation-settings";
import { Algorithm } from "../lib/domain/types";
import { loadAllPresets, type Preset, type UnprocessedPreset } from "../lib/domain/preset";
import { fileToImageData } from "../lib/image/canvas";
import { useObamifyWorker } from "../lib/hooks/useObamifyWorker";
import { SimulationCanvas, type SimState } from "../components/SimulationCanvas";
import { initImage } from "../lib/algorithms/morph-sim";
import { GifRecorder, GIF_RESOLUTION, GIF_MAX_FRAMES } from "../lib/media/gif-recorder";
import { drawSeeds } from "../lib/render/draw";
import {
  deleteStoredPreset,
  listStoredPresets,
  loadStoredPreset,
  savePresetToStore,
  type StoredPresetMeta
} from "../lib/storage/preset-store";
import { useDrawingWorker } from "../lib/hooks/useDrawingWorker";
import { initPixelData } from "../lib/algorithms/drawing";

const buildSettings = (settings: GenerationSettings) =>
  new GenerationSettings({
    id: settings.id,
    name: settings.name,
    proximityImportance: settings.proximityImportance,
    algorithm: settings.algorithm,
    sidelen: settings.sidelen,
    targetCropScale: settings.targetCropScale,
    sourceCropScale: settings.sourceCropScale
  });

export default function HomePage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentSource, setCurrentSource] = useState<UnprocessedPreset | null>(null);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [settings, setSettings] = useState(() => GenerationSettings.default("Custom")); 
  const [simState, setSimState] = useState<SimState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [storedPresets, setStoredPresets] = useState<StoredPresetMeta[]>([]);

  const worker = useObamifyWorker();
  const drawingWorker = useDrawingWorker();
  const pixelDataRef = useRef(initPixelData(0));

  useEffect(() => {
    loadAllPresets().then((loaded) => {
      setPresets(loaded);
      if (loaded.length > 0) {
        setCurrentSource(loaded[0].inner);
        setActivePreset(loaded[0]);
        const { seeds, colors, sim } = initImage(loaded[0].inner.width, loaded[0]);
        sim.preparePlay(seeds, reverse);
        setSimState({ sim, seeds, colors, sidelen: loaded[0].inner.width });
      }
    });
  }, [reverse]);

  useEffect(() => {
    listStoredPresets().then(setStoredPresets).catch(console.error);
  }, []);

  useEffect(() => {
    if (!worker.result) return;
    setActivePreset(worker.result);
    const { seeds, colors, sim } = initImage(worker.result.inner.width, worker.result);
    sim.preparePlay(seeds, reverse);
    setSimState({ sim, seeds, colors, sidelen: worker.result.inner.width });
    setPlaying(true);
  }, [worker.result, reverse]);

  useEffect(() => {
    if (drawingWorker.assignments && simState) {
      simState.sim.setAssignments(drawingWorker.assignments, simState.sidelen);
    }
  }, [drawingWorker.assignments, simState]);

  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      setCurrentSource(preset.inner);
      setActivePreset(preset);
      const { seeds, colors, sim } = initImage(preset.inner.width, preset);
      sim.preparePlay(seeds, reverse);
      setSimState({ sim, seeds, colors, sidelen: preset.inner.width });
      setPlaying(false);
    },
    [reverse]
  );

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const image = await fileToImageData(files[0]);
    const unprocessed: UnprocessedPreset = {
      name: files[0].name,
      width: image.width,
      height: image.height,
      sourceImg: new Uint8ClampedArray(image.data)
    };
    setCurrentSource(unprocessed);
    setActivePreset(null);
    setSimState(null);
  };

  const updateSetting = (updates: Partial<GenerationSettings>) => {
    setSettings((prev) => {
      const next = buildSettings(prev);
      Object.assign(next, updates);
      return next;
    });
  };

  const handleRun = () => {
    if (!currentSource) return;
    worker.startJob(currentSource, settings);
    setPlaying(false);
  };

  const handleCancel = () => {
    worker.cancelJob();
    setPlaying(false);
  };

  const handleReverse = () => {
    if (!simState) return;
    simState.sim.preparePlay(simState.seeds, !reverse);
    setReverse((prev) => !prev);
    setPlaying(true);
  };

  const handleReset = () => {
    if (!simState) return;
    simState.sim.preparePlay(simState.seeds, reverse);
  };

  const refreshStoredPresets = () => listStoredPresets().then(setStoredPresets);

  const handleSavePreset = async () => {
    if (!worker.result) return;
    await savePresetToStore(worker.result);
    refreshStoredPresets();
  };

  const handleLoadStoredPreset = async (id: string) => {
    const preset = await loadStoredPreset(id);
    if (preset) {
      handleSelectPreset(preset);
    }
  };

  const handleDeleteStoredPreset = async (id: string) => {
    await deleteStoredPreset(id);
    refreshStoredPresets();
  };

  const handleExportGif = async () => {
    if (!activePreset) return;
    const { seeds, colors, sim } = initImage(activePreset.inner.width, activePreset);
    sim.preparePlay(seeds, reverse);
    const canvas = document.createElement("canvas");
    canvas.width = GIF_RESOLUTION;
    canvas.height = GIF_RESOLUTION;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const recorder = new GifRecorder();
    recorder.start();
    for (let frame = 0; frame < GIF_MAX_FRAMES; frame++) {
      sim.update(seeds, activePreset.inner.width);
      drawSeeds(ctx, seeds, colors, activePreset.inner.width, GIF_RESOLUTION);
      const frameData = ctx.getImageData(0, 0, GIF_RESOLUTION, GIF_RESOLUTION).data;
      recorder.addFrame(frameData);
    }
    recorder.finish();
    const status = recorder.getStatus();
    if (status.type === "complete") {
      const blob = new Blob([status.data], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `obamify-${Date.now()}.gif`;
      anchor.click();
      URL.revokeObjectURL(url);
    } else if (status.type === "error") {
      alert(status.message);
    }
  };

  const handleDrawingRefine = () => {
    if (!currentSource || !simState) return;
    drawingWorker.startJob(
      currentSource,
      settings,
      simState.colors,
      pixelDataRef.current,
      0
    );
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Obamify</p>
        <h1 className="text-4xl font-semibold">Local Next.js Playground</h1>
        <p className="text-slate-300">
          Load a preset, tweak generation settings, and let the fully client-side workers crunch
          through the Obama transformation algorithms. No servers, no uploads.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Presets</h2>
          <div className="flex flex-wrap gap-3">
            {presets.map((preset) => (
              <button
                key={preset.inner.name}
                onClick={() => handleSelectPreset(preset)}
                className={`rounded-full px-4 py-2 text-sm ${
                  preset.inner.name === activePreset?.inner.name
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {preset.inner.name}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Upload custom image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleFileUpload(event.target.files)}
              className="w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/30"
            />
          </div>
          <SettingsPanel settings={settings} updateSetting={updateSetting} />
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-white px-4 py-2 text-black disabled:opacity-30"
              onClick={handleRun}
              disabled={!currentSource || worker.status === "running"}
            >
              Start generation
            </button>
            <button
              className="rounded-full border border-white/40 px-4 py-2 text-white"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="rounded-full border border-white/40 px-4 py-2 text-white"
              onClick={handleReverse}
              disabled={!simState}
            >
              Reverse
            </button>
            <button
              className="rounded-full border border-white/40 px-4 py-2 text-white"
              onClick={handleReset}
              disabled={!simState}
            >
              Reset playback
            </button>
            <button
              className="rounded-full border border-white/40 px-4 py-2 text-white"
              onClick={handleSavePreset}
              disabled={!worker.result}
            >
              Save preset locally
            </button>
            <button
              className="rounded-full border border-white/40 px-4 py-2 text-white"
              onClick={handleExportGif}
              disabled={!activePreset}
            >
              Export GIF
            </button>
            <button
              className="rounded-full border border-white/40 px-4 py-2 text-white"
              onClick={handleDrawingRefine}
              disabled={!simState}
            >
              Drawing refinement
            </button>
          </div>
          <ProgressPanel worker={worker} />
        </div>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold">Stored presets</h3>
          {storedPresets.length === 0 && (
            <p className="text-sm text-slate-400">No local presets yet.</p>
          )}
          <ul className="space-y-2">
            {storedPresets.map((preset) => (
              <li
                key={preset.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <span>{preset.name}</span>
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-white/20 px-3 py-1 text-xs text-white"
                    onClick={() => handleLoadStoredPreset(preset.id)}
                  >
                    Load
                  </button>
                  <button
                    className="rounded-full bg-red-500/70 px-3 py-1 text-xs text-white"
                    onClick={() => handleDeleteStoredPreset(preset.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <PreviewPane preview={worker.preview} />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Simulation</h3>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={playing}
                onChange={() => setPlaying((prev) => !prev)}
              />
              Playing
            </label>
          </div>
          <SimulationCanvas state={simState} playing={playing} />
        </div>
      </section>
    </main>
  );
}

function SettingsPanel({
  settings,
  updateSetting
}: {
  settings: GenerationSettings;
  updateSetting: (updates: Partial<GenerationSettings>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Algorithm
          <select
            value={settings.algorithm}
            className="rounded-xl bg-black/40 px-3 py-2 text-white"
            onChange={(event) =>
              updateSetting({
                algorithm:
                  event.target.value === Algorithm.Optimal ? Algorithm.Optimal : Algorithm.Genetic
              })
            }
          >
            <option value={Algorithm.Genetic}>Genetic (fast)</option>
            <option value={Algorithm.Optimal}>Optimal (slow)</option>
          </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Resolution ({settings.sidelen}px)
        <input
          type="range"
          min={64}
          max={256}
          step={32}
          value={settings.sidelen}
          onChange={(event) => updateSetting({ sidelen: Number(event.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Proximity importance ({settings.proximityImportance})
        <input
          type="range"
          min={5}
          max={30}
          value={settings.proximityImportance}
          onChange={(event) =>
            updateSetting({ proximityImportance: Number(event.target.value) })
          }
        />
      </label>
    </div>
  );
}

function ProgressPanel({ worker }: { worker: ReturnType<typeof useObamifyWorker> }) {
  return (
    <div className="space-y-2 text-sm text-slate-300">
      <p>
        Status: <span className="font-semibold text-white">{worker.status}</span>
      </p>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${Math.round(worker.progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

function PreviewPane({ preview }: { preview: ImageData | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!preview || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    ctx.putImageData(preview, 0, 0);
  }, [preview]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Worker preview</h3>
        {!preview && <span className="text-sm text-slate-400">No preview yet</span>}
      </div>
      <canvas
        ref={canvasRef}
        className="h-64 w-full rounded-2xl border border-white/10 bg-black object-contain"
      />
    </div>
  );
}
