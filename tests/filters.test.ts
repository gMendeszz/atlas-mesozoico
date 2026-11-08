import { describe, it, expect } from "vitest";
import { calculate, defaultFilters, dominantGroup, filtersFromURL, filtersToURL, clearFilters } from "../src/filters";
import { testData } from "./test-data";
import type { TimeSlice, Filters } from "../src/types";

const sum = (list: ArrayLike<number>) => Array.from(list).reduce((a, b) => a + b, 0);

describe("calculate: time filter", () => {
  it("includes a site whose age range only overlaps the selected range (it doesn't have to fit inside)", () => {
    // Site 1 is 72.2–61.66 Ma: it starts in the Cretaceous and ends after it
    const f = { ...defaultFilters(), from: 70, to: 66 };
    const ids = calculate(testData(), f).features.map((p) => p.id);
    expect(ids).toEqual([1]);
  });

  it("excludes sites entirely outside the range", () => {
    const f = { ...defaultFilters(), from: 139, to: 100 };
    expect(calculate(testData(), f).features).toHaveLength(0);
  });
});

describe("calculate: counts for each option", () => {
  it("each group's count ignores the group filter itself (shows what you'd get by checking it)", () => {
    const f = { ...defaultFilters(), groups: [true, false, false, false] };
    const r = calculate(testData(), f);
    expect(r.byGroup).toEqual([2, 1, 1, 3]); // all groups counted...
    expect(r.totalFossils).toBe(2); // ...but only the theropods on the map
  });

  it("each group's count respects country and time", () => {
    const r = calculate(testData(), { ...defaultFilters(), country: "BR" });
    expect(r.byGroup).toEqual([1, 0, 0, 2]);
  });

  it("each country's count ignores the country filter, but respects the group", () => {
    const data = testData();
    const r = calculate(data, { ...defaultFilters(), country: "BR", groups: [false, true, true, false] });
    expect(r.byCountry[data.dict.country.indexOf("US")]).toBe(2);
    expect(r.byCountry[data.dict.country.indexOf("BR")]).toBe(0);
  });

  it("each point's size (n) only counts fossils from the checked groups", () => {
    const r = calculate(testData(), { ...defaultFilters(), groups: [false, false, false, true] });
    expect(r.features.find((p) => p.id === 0)?.properties.n).toBe(2);
    expect(r.features.find((p) => p.id === 1)).toBeUndefined(); // site 1 has no "others"
  });
});

describe("calculate: fossil type and diet", () => {
  it("footprints only: shows the footprint and counts the other types without filtering by type", () => {
    const r = calculate(testData(), { ...defaultFilters(), types: [false, true, false] });
    expect(r.totalFossils).toBe(1);
    expect(r.features.map((p) => p.id)).toEqual([0]);
    expect(r.byType).toEqual([5, 1, 1]);
  });

  it("the diet filter changes the counts of the other filters", () => {
    const r = calculate(testData(), { ...defaultFilters(), diets: [true, false, false, false, false] });
    expect(r.totalFossils).toBe(2); // the 2 carnivores
    expect(r.byGroup).toEqual([2, 0, 0, 0]);
    expect(r.byType).toEqual([2, 0, 0]);
    expect(r.byDiet).toEqual([2, 2, 0, 0, 3]); // its own count ignores the diet filter
  });
});

describe("dominantGroup (point color)", () => {
  it('"Others" only wins when there are none of the three main groups', () => {
    expect(dominantGroup([1, 0, 0, 9])).toBe(0);
    expect(dominantGroup([0, 0, 0, 9])).toBe(3);
  });

  it("a tie goes to the first group in the list (stable result)", () => {
    expect(dominantGroup([0, 2, 2, 0])).toBe(1);
  });
});

describe("calculate: ancient continents", () => {
  const paleo: TimeSlice = { t: 150, points: [-170, -400, null, null, 1785, -501], coasts: { type: "FeatureCollection", features: [] } };

  it("uses the ancient position (in tenths of a degree)", () => {
    const r = calculate(testData(), defaultFilters(), paleo);
    expect(r.features.find((p) => p.id === 0)?.geometry.coordinates).toEqual([-17, -40]);
  });

  it("a site the model can't reconstruct leaves the map and goes into the hidden count", () => {
    const r = calculate(testData(), defaultFilters(), paleo);
    expect(r.features.map((p) => p.id)).toEqual([0, 2]);
    expect(r.noPosition).toBe(3); // the 3 fossils at site 1
    expect(r.totalFossils).toBe(4);
  });
});

describe("calculate: histogram", () => {
  it("ignores the time filter (shows the whole distribution, with the range highlighted on top)", () => {
    const data = testData();
    const all = calculate(data, defaultFilters()).histogram;
    const slice = calculate(data, { ...defaultFilters(), from: 100, to: 80 }).histogram;
    expect([...slice]).toEqual([...all]);
  });
});

describe("filters in the URL", () => {
  it("a hand-edited link with absurd values is clamped to valid values", () => {
    const f = filtersFromURL("?from=999&to=500");
    expect(f.from).toBe(252);
    expect(f.to).toBe(250); // never less than 2 Ma from the other handle
  });

  it("an inverted range doesn't produce an impossible filter", () => {
    const f = filtersFromURL("?from=100&to=150");
    expect(f.to).toBeLessThan(f.from);
  });

  it("the country code only accepts short letters/numbers (nothing reaches the screen without going through here)", () => {
    expect(filtersFromURL('?country="><script>').country).toMatch(/^[A-Z0-9]{0,3}$/);
  });

  it("a round trip preserves the state", () => {
    const original: Filters = {
      ...defaultFilters(),
      from: 201.4,
      to: 145,
      groups: [true, false, true, false],
      types: [false, true, true],
      diets: [true, true, false, false, false],
      country: "BR",
      continents: "ancient",
    };
    const back = filtersFromURL(filtersToURL(original));
    expect(back).toEqual(original);
  });

  it("the default state produces an empty URL (a clean link to share)", () => {
    expect(filtersToURL(defaultFilters())).toBe("");
  });

  it("the map numbers match the sum of the points", () => {
    const r = calculate(testData(), defaultFilters());
    expect(sum(r.features.map((p) => p.properties.n))).toBe(r.totalFossils);
  });
});

describe("clearFilters", () => {
  it("resets everything to the defaults, but keeps the continents choice (a display option, not a filter)", () => {
    const dirty: Filters = { ...defaultFilters(), from: 150, country: "BR", types: [true, false, false], continents: "ancient" };
    expect(clearFilters(dirty)).toEqual({ ...defaultFilters(), continents: "ancient" });
  });
});
