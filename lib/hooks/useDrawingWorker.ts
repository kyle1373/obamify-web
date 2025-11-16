"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationSettings } from "../domain/generation-settings";
import type { UnprocessedPreset } from "../domain/preset";
import { serializeGenerationSettings } from "../domain/serialization";
import type { DrawingWorkerEvent } from "../../workers/types";
import type { SeedColor } from "../algorithms/sim-types";
import type { PixelData } from "../algorithms/drawing";

interface DrawingState {
  jobId: string | null;
  assignments: number[] | null;
  status: "idle" | "running";
}

const initialState: DrawingState = {
  jobId: null,
  assignments: null,
  status: "idle"
};

export function useDrawingWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<DrawingState>(initialState);

  useEffect(() => {
    const worker = new Worker(
      new URL("../../workers/drawing.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<DrawingWorkerEvent>) => {
      const message = event.data;
      setState((prev) => {
        if (prev.jobId !== message.jobId) {
          return prev;
        }
        switch (message.type) {
          case "assignments":
            return { ...prev, assignments: message.assignments };
          case "cancelled":
            return { ...prev, jobId: null, status: "idle" };
          case "error":
            console.error(message.message);
            return { ...prev, jobId: null, status: "idle" };
          default:
            return prev;
        }
      });
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const startJob = useCallback(
    (
      source: UnprocessedPreset,
      settings: GenerationSettings,
      colors: SeedColor[],
      pixelData: PixelData[],
      frameCount: number
    ) => {
      const worker = workerRef.current;
      if (!worker) return;
      const jobId = crypto.randomUUID();
      setState({ jobId, assignments: null, status: "running" });
      worker.postMessage({
        type: "start",
        jobId,
        source,
        settings: serializeGenerationSettings(settings),
        colors,
        pixelData,
        frameCount
      });
    },
    []
  );

  const cancelJob = useCallback(() => {
    const worker = workerRef.current;
    if (worker && state.jobId) {
      worker.postMessage({ type: "cancel", jobId: state.jobId });
    }
  }, [state.jobId]);

  return {
    ...state,
    startJob,
    cancelJob
  };
}

