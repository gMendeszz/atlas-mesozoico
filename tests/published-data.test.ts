// Checks the REAL data files that ship with the site (public/data). Run after every data
// update: catches out-of-sync files and new problems coming from the PBDB before publishing.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { prepareData } from "../src/data";
import { countryName } from "../src/text";
import { searchableNames, sitesForName } from "../src/search";
import { GROUPS, TYPES, DIETS } from "../src/constants";
import { decodeCoasts } from "../src/paleo";
import type { RawData } from "../src/types";

const read = (path: string) => JSON.parse(readFileSync(new URL(`../public/data/${path}`, import.meta.url), "utf8"));
const raw: RawData = read("dinos.json");
const data = prepareData(raw);
const S = data.sites;
const nSites = S.col.length;

describe("dinos.json", () => {
  it("every site column has the same length", () => {
    for (const [column, values] of Object.entries(S)) expect(values, column).toHaveLength(nSites);
  });

  it("the sum of fossils per site matches the fossil list", () => {
    const total = S.n.reduce((a, b) => a + b, 0);
    for (const [column, values] of Object.entries(data.fossils)) expect(values, column).toHaveLength(total);
  });

  it("every index points to an entry that exists in the dictionary", () => {
    const check = (column: number[], dict: unknown[]) => expect(Math.max(...column)).toBeLessThan(dict.length);
    check(S.country, data.dict.country);
    check(S.state, data.dict.state);
    check(S.interval, data.dict.interval);
    check(data.fossils.name, data.dict.name);
    check(data.fossils.family, data.dict.family);
    check(raw.uncertain!.name, data.dict.original_name);
    check(S.formation, data.dict.formation);
    check(data.fossils.author, data.dict.author);
    check(data.fossils.type, TYPES);
    check(data.fossils.diet, DIETS);
  });

  it("the group, type and diet lists are in the same order in the site and the data", () => {
    expect(raw.meta.groups).toEqual(GROUPS.map((g) => g.key));
    expect(raw.meta.types).toEqual(TYPES.map((t) => t.key));
    expect(raw.meta.diets).toEqual(DIETS.map((d) => d.key));
  });

  it("coordinates and ages are valid", () => {
    for (let i = 0; i < nSites; i++) {
      expect(Math.abs(S.lat[i]), `site ${S.col[i]}`).toBeLessThanOrEqual(90);
      expect(Math.abs(S.lng[i]), `site ${S.col[i]}`).toBeLessThanOrEqual(180);
      expect(S.max[i], `site ${S.col[i]}`).toBeGreaterThanOrEqual(S.min[i]);
    }
  });

  it("the sites with impossible coordinates (data check of 2026-11-04) stay out", () => {
    for (const col of [64690, 108343, 153528, 155218]) expect(S.col).not.toContain(col);
  });

  it("every country code has a name (catches new non-ISO PBDB codes, like O2 was)", () => {
    const unnamed = data.dict.country.filter((cc) => cc && countryName(cc) === cc);
    expect(unnamed).toEqual([]);
  });

  it("every search suggestion (names and formations) finds at least one fossil", () => {
    const noResult = searchableNames(data).filter((s) => !sitesForName(data, s).sites.size);
    expect(noResult).toEqual([]);
  });

  it("uncertain identifications point to fossils that exist, without repeats", () => {
    const j = raw.uncertain!.j;
    expect(new Set(j).size).toBe(j.length);
    expect(Math.max(...j)).toBeLessThan(data.fossils.name.length);
  });
});

describe("ancient-continents time slices (public/data/paleo)", () => {
  const files = readdirSync(new URL("../public/data/paleo/", import.meta.url));

  it("all time slices from 70 to 250 Ma exist", () => {
    const slices = files.map((f) => parseInt(f)).sort((a, b) => a - b);
    expect(slices).toEqual(Array.from({ length: 19 }, (_, k) => 70 + 10 * k));
  });

  for (const file of files) {
    describe(file, () => {
      const p = read(`paleo/${file}`);

      it("was generated from this same site list", () => {
        // If this fails: run scripts/fetch_paleo.py after fetch_data.py
        expect(p.signature).toBe(raw.meta.sites_signature);
        expect(p.points).toHaveLength(2 * nSites);
      });

      it("ancient positions are on the globe", () => {
        for (let k = 0; k < p.points.length; k += 2) {
          if (p.points[k] === null) continue;
          expect(Math.abs(p.points[k])).toBeLessThanOrEqual(1800);
          expect(Math.abs(p.points[k + 1])).toBeLessThanOrEqual(900);
        }
      });

      it("the outlines become valid polygons (closed, at least 3 sides)", () => {
        for (const outline of decodeCoasts(p.coasts).features) {
          const ring = outline.geometry.coordinates[0];
          expect(ring.length).toBeGreaterThanOrEqual(4);
          expect(ring.at(-1)).toEqual(ring[0]);
        }
      });
    });
  }
});
