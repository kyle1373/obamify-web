import { processPreset } from "../lib/algorithms/process";
import { deserializeGenerationSettings } from "../lib/domain/serialization";
import type { ObamifyWorkerCommand, ObamifyWorkerEvent } from "./types";
import type { ProgressMsg } from "../lib/domain/types";
import type { Preset } from "../lib/domain/preset";

const controllers = new Map<string, AbortController>();

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ObamifyWorkerCommand>) => {
  const message = event.data;
  switch (message.type) {
    case "start":
      await handleStart(message);
      break;
    case "cancel":
      handleCancel(message.jobId);
      break;
    default:
      break;
  }
};

async function handleStart(message: Extract<ObamifyWorkerCommand, { type: "start" }>) {
  const settings = deserializeGenerationSettings(message.settings);
  const controller = new AbortController();
  controllers.set(message.jobId, controller);

  try {
    await processPreset(
      message.preset,
      settings,
      (progress) => forwardProgress(message.jobId, progress),
      { signal: controller.signal }
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

function forwardProgress(jobId: string, progress: ProgressMsg<Preset>) {
  switch (progress.type) {
    case "progress":
      postEvent({ type: "progress", jobId, value: progress.value });
      break;
    case "preview":
      postEvent({
        type: "preview",
        jobId,
        width: progress.width,
        height: progress.height,
        data: progress.data
      });
      break;
    case "assignments":
      postEvent({ type: "assignments", jobId, assignments: progress.assignments });
      break;
    case "done":
      postEvent({ type: "done", jobId, preset: progress.payload });
      break;
    case "error":
      postEvent({ type: "error", jobId, message: progress.message });
      break;
    case "cancelled":
      postEvent({ type: "cancelled", jobId });
      break;
    default:
      break;
  }
}

function postEvent(event: ObamifyWorkerEvent) {
  ctx.postMessage(event);
}

