import { describe, it, expect } from "vitest";
import { initImage } from "./morph-sim";
import type { Preset } from "../domain/preset";

const createPreset = (): Preset => {
  const data = new Uint8ClampedArray([
    0, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255
  ]);
  return {
    inner: {
      name: "test",
      width: 2,
      height: 2,
      sourceImg: data
    },
    assignments: [0, 1, 2, 3]
  };
};

describe("Sim initialization", () => {
  it("builds seed positions and colors from preset", () => {
    const preset = createPreset();
    const { seedCount, seeds, colors, sim } = initImage(128, preset);
    expect(seedCount).toBe(4);
    expect(seeds).toHaveLength(4);
    expect(colors[0].rgba[3]).toBe(1);

    sim.preparePlay(seeds, false);
    sim.update(seeds, 128);
    expect(seeds[0].xy[0]).toBeGreaterThan(0);
  });
});

