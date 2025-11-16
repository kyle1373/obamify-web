"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationSettings } from "../domain/generation-settings";
import type { UnprocessedPreset, Preset } from "../domain/preset";
import { serializeGenerationSettings } from "../domain/serialization";
import type { ObamifyWorkerEvent } from "../../workers/types";

interface WorkerState {
  jobId: string | null;
  progress: number;
  preview: ImageData | null;
  assignments: number[] | null;
  result: Preset | null;
  status: "idle" | "running" | "done" | "error";
  error?: string;
}

const initialState: WorkerState = {
  jobId: null,
  progress: 0,
  preview: null,
  assignments: null,
  result: null,
  status: "idle",
  error: undefined
};

export function useObamifyWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<WorkerState>(initialState);

  useEffect(() => {
    const worker = new Worker(
      new URL("../../workers/obamify.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<ObamifyWorkerEvent>) => {
      const message = event.data;
      setState((prev) => {
        if (prev.jobId !== message.jobId && message.type !== "done") {
          return prev;
        }
        switch (message.type) {
          case "progress":
            return { ...prev, progress: message.value, status: "running" };
          case "preview":
            return {
              ...prev,
              preview: new ImageData(message.data, message.width, message.height)
            };
          case "assignments":
            return { ...prev, assignments: message.assignments };
          case "done":
            return {
              ...prev,
              result: message.preset,
              status: "done",
              jobId: null
            };
          case "error":
            return {
              ...prev,
              status: "error",
              error: message.message,
              jobId: null
            };
          case "cancelled":
            return { ...prev, status: "idle", jobId: null };
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

  const startJob = useCallback((preset: UnprocessedPreset, settings: GenerationSettings) => {
    const worker = workerRef.current;
    if (!worker) {
      throw new Error("Worker not ready");
    }
    const jobId = crypto.randomUUID();
    setState({
      jobId,
      progress: 0,
      preview: null,
      assignments: null,
      result: null,
      status: "running",
      error: undefined
    });
    worker.postMessage({
      type: "start",
      jobId,
      preset,
      settings: serializeGenerationSettings(settings)
    });
  }, []);

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

