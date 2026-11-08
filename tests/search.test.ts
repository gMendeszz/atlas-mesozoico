import { describe, it, expect } from "vitest";
import { sitesForName, searchableNames, searchSummary } from "../src/search";
import { calculate, defaultFilters } from "../src/filters";
import { testData } from "./test-data";

describe("sitesForName", () => {
  it("searching the genus finds its species", () => {
    expect([...sitesForName(testData(), "Tyrannosaurus").sites]).toEqual([0]);
  });

  it("doesn't confuse a genus with a family that starts the same way (Tyrannosaurus ≠ Tyrannosauridae)", () => {
    const data = testData();
    data.fossils.name[3] = 2; // a fossil at site 1 becomes "Tyrannosauridae"
    expect([...sitesForName(data, "Tyrannosaurus").sites]).toEqual([0]);
  });

  it("ignores case and surrounding spaces", () => {
    expect(sitesForName(testData(), "  tyrannosaurus REX ").fossils).toBe(1);
  });

  it("reports how many of the matches have an uncertain identification", () => {
    expect(sitesForName(testData(), "Tyrannosaurus rex").uncertain).toBe(1);
  });

  it("a nonexistent name finds nothing (and doesn't break)", () => {
    expect(sitesForName(testData(), "Pikachu").sites.size).toBe(0);
    expect(sitesForName(testData(), "").sites.size).toBe(0);
  });
});

describe("search by geological formation", () => {
  it("finds it with or without the word Formation, case-insensitive", () => {
    expect([...sitesForName(testData(), "Santa Maria Formation").sites]).toEqual([0]);
    expect([...sitesForName(testData(), "santa maria").sites]).toEqual([0]);
  });

  it("also finds sites where the formation is uncertain in the PBDB", () => {
    const match = sitesForName(testData(), "Hell Creek");
    expect([...match.sites]).toEqual([1]);
    expect(match.fossils).toBe(3);
  });

  it("a dinosaur name takes priority over a formation", () => {
    const data = testData();
    data.dict.formation[1] = "Tyrannosaurus rex"; // a formation named like a fossil
    expect(sitesForName(data, "Tyrannosaurus rex").fossils).toBe(1);
  });
});

describe("searchableNames (search suggestions)", () => {
  it("only suggests names that actually have fossils", () => {
    // A bug that existed: uncertain original texts ("? Abelisauria indet.") showed up in the
    // suggestions and, when chosen, found nothing.
    const suggestions = searchableNames(testData());
    expect(suggestions).not.toContain("Tyrannosauridae"); // in the dictionary, no fossil
    expect(suggestions).not.toContain("cf. Tyrannosaurus rex"); // uncertain original text
    expect(suggestions).toContain("Tyrannosaurus rex");
  });

  it('suggests each formation once, without the uncertain "(?)"', () => {
    const suggestions = searchableNames(testData());
    expect(suggestions).toContain("Santa Maria Formation");
    expect(suggestions).toContain("Hell Creek Formation");
    expect(suggestions.filter((s) => s.endsWith(" Formation"))).toHaveLength(2);
  });
});

describe("searchSummary (text under the field, read by screen readers)", () => {
  const data = testData();
  const points = (ids: number[]) => calculate(data, defaultFilters()).features.filter((p) => ids.includes(p.id));

  it("no text, no summary; no result, says so", () => {
    expect(searchSummary(data, "", null, [])).toBe("");
    expect(searchSummary(data, "Xyz", sitesForName(data, "Xyz"), [])).toBe("No fossils found for “Xyz”.");
  });

  it("counts fossils, sites and uncertain ones, and says where they are", () => {
    const match = sitesForName(data, "Tyrannosaurus");
    expect(searchSummary(data, "Tyrannosaurus", match, points([0]))).toBe(
      "Tyrannosaurus: 1 fossil at 1 site (1 with uncertain identification). Sites: Rio Grande do Sul, Brazil"
    );
  });

  it("warns when the filters hide matched sites", () => {
    const match = sitesForName(data, "Dinosauria"); // sites 0 and 2
    expect(searchSummary(data, "Dinosauria", match, points([2]))).toContain("1 site is hidden by the current filters.");
  });
});
