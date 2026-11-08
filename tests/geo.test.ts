import { describe, it, expect } from "vitest";
import { boundsOfPoints } from "../src/geo";

describe("boundsOfPoints (fitting the map)", () => {
  it("a country crossing the date line doesn't turn into a whole-world fit", () => {
    // New Zealand: main islands (~172° E) and the Chatham Islands (-176.7°, on the other side)
    const [[west], [east]] = boundsOfPoints([
      [172.6, -43.5],
      [174.8, -41.3],
      [-176.7, -43.8],
    ])!;
    expect(east - west).toBeLessThan(15);
  });

  it("common case: a simple box around the points", () => {
    expect(
      boundsOfPoints([
        [-53.7, -29.7],
        [-40.5, -7.5],
      ])
    ).toEqual([
      [-53.7, -29.7],
      [-40.5, -7.5],
    ]);
  });

  it("with no points there's nothing to fit", () => {
    expect(boundsOfPoints([])).toBeNull();
  });
});
