import type { SeedPos, SeedColor } from "../algorithms/sim-types";

export function drawSeeds(
  ctx: CanvasRenderingContext2D,
  seeds: SeedPos[],
  colors: SeedColor[],
  sidelen: number,
  canvasSize: number
) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  const scale = canvasSize / sidelen;
  seeds.forEach((seed, idx) => {
    const color = colors[idx]?.rgba ?? [0, 0, 0, 1];
    ctx.fillStyle = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(
      color[2] * 255
    )}, ${color[3]})`;
    ctx.fillRect(seed.xy[0] * scale, seed.xy[1] * scale, Math.max(1, scale), Math.max(1, scale));
  });
}

