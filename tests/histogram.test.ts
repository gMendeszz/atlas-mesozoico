import { describe, it, expect } from "vitest";
import { spreadOverHistogram } from "../src/filters";
import { histogramPath } from "../src/histogram";
import { MA_SPAN } from "../src/constants";

const fresh = () => new Float64Array(MA_SPAN);
const sum = (h: Float64Array) => h.reduce((a, b) => a + b, 0);

describe("spreadOverHistogram", () => {
  it("keeps the total when the range is inside the Mesozoic", () => {
    const h = fresh();
    spreadOverHistogram(h, 230, 220.5, 7);
    expect(sum(h)).toBeCloseTo(7, 9);
  });

  it("spreads evenly across the range (the exact age isn't known)", () => {
    const h = fresh();
    spreadOverHistogram(h, 230, 220, 10); // a 10 Ma range -> 1 per million years
    const used = [...h].filter((v) => v > 0);
    expect(used).toHaveLength(10);
    for (const v of used) expect(v).toBeCloseTo(1, 9);
  });

  it("a range extending past the end of the Mesozoic only counts the part inside", () => {
    // 72.2–61.66 Ma: only (72.2 − 66) / (72.2 − 61.66) ≈ 59% of this range is Mesozoic.
    // A bug that existed: the whole fossil was dumped into the last 6 Ma of the Cretaceous.
    const h = fresh();
    spreadOverHistogram(h, 72.2, 61.66, 1);
    expect(sum(h)).toBeCloseTo((72.2 - 66) / (72.2 - 61.66), 9);
  });

  it("an exact age (zero-width range) goes entirely into the right million years", () => {
    const h = fresh();
    spreadOverHistogram(h, 100, 100, 3);
    expect(sum(h)).toBe(3);
    expect(h[252 - 100]).toBe(3);
  });

  it("a range entirely outside the Mesozoic isn't counted", () => {
    const h = fresh();
    spreadOverHistogram(h, 60, 50, 5);
    expect(sum(h)).toBe(0);
  });
});

describe("histogramPath", () => {
  it("with no fossils, draws a flat line on the ground (doesn't break dividing by zero)", () => {
    expect(histogramPath(fresh())).not.toMatch(/NaN|Infinity/);
  });

  it("the million years with the most fossils touches the top of the drawing", () => {
    const h = fresh();
    h[10] = 50;
    h[20] = 5;
    expect(histogramPath(h)).toContain("L10,2.0L11,2.0");
  });
});
