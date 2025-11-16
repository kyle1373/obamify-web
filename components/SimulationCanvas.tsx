"use client";

import { useEffect, useRef } from "react";
import type { SeedPos, SeedColor } from "../lib/algorithms/sim-types";
import { drawSeeds } from "../lib/render/draw";
import type { Sim } from "../lib/algorithms/morph-sim";

export interface SimState {
  sim: Sim;
  seeds: SeedPos[];
  colors: SeedColor[];
  sidelen: number;
}

interface Props {
  state: SimState | null;
  playing: boolean;
  width?: number;
}

export function SimulationCanvas({ state, playing, width = 320 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!state) {
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, width, width);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame: number;
    const render = () => {
      if (playing) {
        state.sim.update(state.seeds, state.sidelen);
      }
      drawSeeds(ctx, state.seeds, state.colors, state.sidelen, width);
      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, [state, playing, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={width}
      className="rounded-xl border border-white/10 bg-black"
    />
  );
}

