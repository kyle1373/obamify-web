export type Rgb = [number, number, number];

export enum Algorithm {
  Optimal = "optimal",
  Genetic = "genetic"
}

export interface ProgressUpdate {
  type: "progress";
  value: number;
}

export interface PreviewUpdate {
  type: "preview";
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface AssignmentUpdate {
  type: "assignments";
  assignments: number[];
}

export interface DoneUpdate<T> {
  type: "done";
  payload: T;
}

export interface ErrorUpdate {
  type: "error";
  message: string;
}

export interface CancelledUpdate {
  type: "cancelled";
}

export type ProgressMsg<T = unknown> =
  | ProgressUpdate
  | PreviewUpdate
  | AssignmentUpdate
  | DoneUpdate<T>
  | ErrorUpdate
  | CancelledUpdate;

export type ProgressSink<T = unknown> = (msg: ProgressMsg<T>) => void;

