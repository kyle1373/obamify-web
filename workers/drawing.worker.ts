import { drawingProcessGenetic } from "../lib/algorithms/drawing";
import { deserializeGenerationSettings } from "../lib/domain/serialization";
import type { DrawingWorkerCommand, DrawingWorkerEvent } from "./types";

const controllers = new Map<string, AbortController>();
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<DrawingWorkerCommand>) => {
  const message = event.data;
  if (message.type === "start") {
    handleStart(message);
  } else {
    handleCancel(message.jobId);
  }
};

async function handleStart(message: Extract<DrawingWorkerCommand, { type: "start" }>) {
  const controller = new AbortController();
  controllers.set(message.jobId, controller);

  try {
    const settings = deserializeGenerationSettings(message.settings);
    await drawingProcessGenetic(
      message.source,
      settings,
      (progress) => {
        if (progress.type === "assignments") {
          postEvent({ type: "assignments", jobId: message.jobId, assignments: progress.assignments });
        } else if (progress.type === "cancelled") {
          postEvent({ type: "cancelled", jobId: message.jobId });
        }
      },
      {
        colors: message.colors,
        pixelData: message.pixelData,
        frameCount: message.frameCount,
        signal: controller.signal
      }
    );
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    postEvent({
      type: "error",
      jobId: message.jobId,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    controllers.delete(message.jobId);
  }
}

function handleCancel(jobId: string) {
  const controller = controllers.get(jobId);
  if (controller) {
    controller.abort();
    controllers.delete(jobId);
    postEvent({ type: "cancelled", jobId });
  }
}

function postEvent(event: DrawingWorkerEvent) {
  ctx.postMessage(event);
}

