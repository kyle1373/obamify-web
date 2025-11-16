"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { GenerationSettings } from "../lib/domain/generation-settings";
import { Algorithm } from "../lib/domain/types";
import type { UnprocessedPreset } from "../lib/domain/preset";
import { fileToImageData } from "../lib/image/canvas";
import { useObamifyWorker } from "../lib/hooks/useObamifyWorker";
import { initImage } from "../lib/algorithms/morph-sim";
import { SimulationCanvas, type SimState } from "../components/SimulationCanvas";

const buildFastSettings = () => {
  const base = GenerationSettings.default("Obamify");
  base.algorithm = Algorithm.Genetic;
  base.sidelen = 160;
  base.proximityImportance = 12;
  return base;
};

export default function HomePage() {
  const [settings] = useState(() => buildFastSettings());
  const [source, setSource] = useState<UnprocessedPreset | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [simState, setSimState] = useState<SimState | null>(null);
  const [playing, setPlaying] = useState(false);
  const worker = useObamifyWorker();

  useEffect(() => {
    return () => {
      if (sourcePreview) {
        URL.revokeObjectURL(sourcePreview);
      }
    };
  }, [sourcePreview]);

  useEffect(() => {
    if (!worker.result) return;
    const { seeds, colors, sim } = initImage(worker.result.inner.width, worker.result);
    sim.preparePlay(seeds, false);
    setSimState({ sim, seeds, colors, sidelen: worker.result.inner.width });
    setPlaying(true);
  }, [worker.result]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await fileToImageData(file);
    const unprocessed: UnprocessedPreset = {
      name: file.name,
      width: image.width,
      height: image.height,
      sourceImg: new Uint8ClampedArray(image.data)
    };
    if (sourcePreview) {
      URL.revokeObjectURL(sourcePreview);
    }
    setSource(unprocessed);
    setSourcePreview(URL.createObjectURL(file));
    setSimState(null);
    setPlaying(false);
  };

  const handleObamify = () => {
    if (!source || worker.status === "running") return;
    worker.startJob(source, settings);
    setSimState(null);
    setPlaying(false);
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4 lg:space-y-0 lg:px-6 lg:py-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <header>
            <h1 className="text-3xl font-semibold">Turn a photo into Obama</h1>
          </header>
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-xs text-slate-300">
              Upload photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer rounded-xl border border-dashed border-white/20 bg-black/20 px-3 py-3 text-center text-sm font-medium text-white file:hidden"
              />
            </label>
            <button
              className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-30"
              onClick={handleObamify}
              disabled={!source || worker.status === "running"}
            >
              {worker.status === "running" ? "Processing…" : "Turn it into Obama"}
            </button>
            <WorkerStatus worker={worker} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
              <span>Obama mosaic</span>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-white/30 px-3 py-1 text-white disabled:opacity-30"
                  onClick={() => setPlaying((prev) => !prev)}
                  disabled={!simState}
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  className="rounded-full border border-white/30 px-3 py-1 text-white disabled:opacity-30"
                  onClick={() => {
                    if (!simState) return;
                    simState.sim.preparePlay(simState.seeds, false);
                    setPlaying(true);
                  }}
                  disabled={!simState}
                >
                  Restart
                </button>
              </div>
            </div>
            <SimulationCanvas state={simState} playing={playing} width={340} />
            {!simState && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Run a transformation to see the animation here.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <PreviewCard title="Original">
            {sourcePreview ? (
              <img
                src={sourcePreview}
                alt="Original upload"
                className="h-44 w-full rounded-xl object-cover"
              />
            ) : (
              <Placeholder>Choose an image to begin.</Placeholder>
            )}
          </PreviewCard>
          <PreviewCard title="Preview">
            <PreviewCanvas image={worker.preview} />
          </PreviewCard>
          <div className="h-3" />
        </section>
      </div>
    </main>
  );
}

function WorkerStatus({ worker }: { worker: ReturnType<typeof useObamifyWorker> }) {
  const rawPercent = Math.min(100, Math.max(0, worker.progress * 100));
  const progressPercent = worker.status === "done" ? 100 : rawPercent;
  return (
    <div className="space-y-2 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <span>Status</span>
        <span className="font-semibold text-white">{worker.status}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">{title}</h3>
      {children}
    </div>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-44 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/30 text-center text-xs text-slate-400">
      {children}
    </div>
  );
}

function PreviewCanvas({ image }: { image: ImageData | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.putImageData(image, 0, 0);
  }, [image]);

  return image ? (
    <canvas
      ref={canvasRef}
      className="h-44 w-full rounded-2xl border border-white/10 bg-black object-contain"
    />
  ) : (
    <Placeholder>Processing preview will appear here.</Placeholder>
  );
}
