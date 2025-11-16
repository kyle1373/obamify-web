import { describe, it, expect } from "vitest";
import { heuristic } from "./heuristics";

describe("heuristic function", () => {
  it("prefers matching colors and proximity", () => {
    const closeScore = heuristic(
      [0, 0],
      [1, 1],
      [10, 20, 30],
      [12, 22, 28],
      5,
      1
    );
    const farScore = heuristic(
      [0, 0],
      [8, 8],
      [10, 20, 30],
      [200, 200, 210],
      5,
      1
    );
    expect(closeScore).toBeLessThan(farScore);
  });

  it("punishes large spatial offsets quadratically", () => {
    const scoreA = heuristic([0, 0], [5, 5], [0, 0, 0], [0, 0, 0], 1, 1);
    const scoreB = heuristic([0, 0], [1, 1], [0, 0, 0], [0, 0, 0], 1, 1);
    expect(scoreA).toBeGreaterThan(scoreB);
  });
});

