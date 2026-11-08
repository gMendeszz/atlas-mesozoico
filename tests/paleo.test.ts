import { describe, it, expect } from "vitest";
import { timeSliceForRange, decodeCoasts } from "../src/paleo";
import { PERIODS } from "../src/constants";

describe("timeSliceForRange (which ancient Earth to show)", () => {
  it("uses the middle of the range, rounded to the nearest ten", () => {
    const [triassic, , cretaceous] = PERIODS;
    expect(timeSliceForRange(triassic.from, triassic.to)).toBe(230);
    expect(timeSliceForRange(cretaceous.from, cretaceous.to)).toBe(110);
    expect(timeSliceForRange(252, 66)).toBe(160);
  });

  it("never asks for a time slice that doesn't exist (there are only 70 to 250 Ma)", () => {
    expect(timeSliceForRange(68, 66)).toBe(70);
    expect(timeSliceForRange(252, 250)).toBe(250);
  });
});

describe("decodeCoasts", () => {
  it("adds up the differences from the first point (the Python script's compact format)", () => {
    // (10,0) -> (+5,+5) -> (+5,-5) in tenths of a degree
    const [outline] = decodeCoasts([[100, 0, 50, 50, 50, -50]]).features;
    expect(outline.geometry.coordinates[0].slice(0, 3)).toEqual([
      [10, 0],
      [15, 5],
      [20, 0],
    ]);
  });

  it("closes the polygon (a GeoJSON requirement; without it MapLibre draws it wrong)", () => {
    const [outline] = decodeCoasts([[100, 0, 50, 50, 50, -50]]).features;
    const ring = outline.geometry.coordinates[0];
    expect(ring.at(-1)).toEqual(ring[0]);
  });

  it("doesn't duplicate the last point when the outline already comes closed", () => {
    const [outline] = decodeCoasts([[0, 0, 10, 0, 0, 10, -10, -10]]).features;
    expect(outline.geometry.coordinates[0]).toHaveLength(4);
  });
});
