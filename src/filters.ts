// Filters: state, reading/writing the URL, and the calculation of points, counts and histogram.
// Everything here is pure logic (no screen or map), receiving the state as a parameter.
import { GROUPS, TYPES, DIETS, OTHERS, MA_START, MA_END, MA_SPAN, MA_GAP, type Option } from "./constants";
import type { Data, RawData, TimeSlice, Filters, Point, Result } from "./types";

export type ListField = "groups" | "types" | "diets";
export type ListCount = "byGroup" | "byType" | "byDiet";

export interface List {
  field: ListField; // in the filter state
  param: string; // URL parameter
  options: Option[];
  column: keyof RawData["fossils"]; // column in the data
  count: ListCount; // count of each option in Result
}

// Per-fossil check/uncheck filters
export const LISTS: List[] = [
  { field: "groups", param: "group", options: GROUPS, column: "group", count: "byGroup" },
  { field: "types", param: "type", options: TYPES, column: "type", count: "byType" },
  { field: "diets", param: "diet", options: DIETS, column: "diet", count: "byDiet" },
];

// Initial state: the whole Mesozoic, everything checked, all countries, present-day continents
export function defaultFilters(): Filters {
  return {
    from: MA_START,
    to: MA_END,
    country: "",
    continents: "present", // a display option; "Clear filters" leaves it alone
    groups: GROUPS.map(() => true),
    types: TYPES.map(() => true),
    diets: DIETS.map(() => true),
  };
}

// "Clear filters": back to the defaults, but keeps the continents display choice
export const clearFilters = (f: Filters): Filters => ({ ...defaultFilters(), continents: f.continents });

export const fullTimeRange = (f: Filters): boolean => f.from >= MA_START && f.to <= MA_END;

// Any filter active? (decides whether the "Clear filters" button shows up)
export const hasActiveFilter = (f: Filters): boolean =>
  !fullTimeRange(f) || Boolean(f.country) || LISTS.some((l) => !f[l.field].every(Boolean));

// Does fossil j pass the group, type and diet filters?
export const fossilVisible = (f: Filters, F: RawData["fossils"], j: number): boolean =>
  LISTS.every((l) => f[l.field][F[l.column][j]]);

// Reads the filters from a query string (?from=..&to=..&group=..&type=..&diet=..&country=..&continents=..).
// The URL may be hand-edited or come from an old link: everything is clamped to valid values.
export function filtersFromURL(queryString: string): Filters {
  const f = defaultFilters();
  const p = new URLSearchParams(queryString);
  for (const l of LISTS) {
    const value = p.get(l.param);
    if (value === null) continue;
    const checked = new Set(value.split(","));
    f[l.field] = l.options.map((o) => checked.has(o.key));
  }
  f.country = (p.get("country") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  const from = parseFloat(p.get("from") ?? "");
  const to = parseFloat(p.get("to") ?? "");
  if (Number.isFinite(from)) f.from = Math.min(MA_START, Math.max(MA_END + MA_GAP, from));
  if (Number.isFinite(to)) f.to = Math.max(MA_END, Math.min(f.from - MA_GAP, to));
  if (p.get("continents") === "ancient") f.continents = "ancient";
  return f;
}

// The reverse: only writes what differs from the defaults (a short URL to share)
export function filtersToURL(f: Filters): string {
  const p = new URLSearchParams();
  if (!fullTimeRange(f)) {
    p.set("from", String(f.from));
    p.set("to", String(f.to));
  }
  for (const l of LISTS) {
    if (f[l.field].every(Boolean)) continue;
    p.set(l.param, l.options.filter((_, i) => f[l.field][i]).map((o) => o.key).join(","));
  }
  if (f.country) p.set("country", f.country);
  if (f.continents === "ancient") p.set("continents", "ancient");
  const qs = p.toString().replaceAll("%2C", ",");
  return qs ? `?${qs}` : "";
}

/**
 * Builds the visible points, the count for each option and the histogram.
 * - Each count respects the OTHER filters (the number next to "Theropods" respects time,
 *   country, type and diet, but not the group filter itself); the histogram ignores the time filter.
 * - A site falls in the time range if its age range OVERLAPS the selected range.
 * - With `paleo` (an ancient-continents time slice), points move to their position at that time;
 *   sites the model can't reconstruct are left out and counted in `noPosition`.
 */
export function calculate(data: Data, f: Filters, paleo: TimeSlice | null = null): Result {
  const { sites: S, fossils: F, start } = data;
  const countryIdx = f.country ? data.dict.country.indexOf(f.country) : -1;
  const byGroup = GROUPS.map(() => 0);
  const byType = TYPES.map(() => 0);
  const byDiet = DIETS.map(() => 0);
  const byCountry = new Uint32Array(data.dict.country.length);
  const histogram = new Float64Array(MA_SPAN); // fossils per million years
  const features: Point[] = [];
  let totalFossils = 0;
  let noPosition = 0;

  for (let i = 0; i < S.col.length; i++) {
    const okTime = S.max[i] >= f.to && S.min[i] <= f.from;
    const okCountry = countryIdx < 0 || S.country[i] === countryIdx;
    const okSite = okTime && okCountry;
    const count = GROUPS.map(() => 0);
    let forHistogram = 0;

    for (let j = start[i]; j < start[i + 1]; j++) {
      const g = F.group[j];
      const t = F.type[j];
      const d = F.diet[j];
      const okG = f.groups[g];
      const okT = f.types[t];
      const okD = f.diets[d];
      if (okSite) {
        if (okT && okD) byGroup[g]++;
        if (okG && okD) byType[t]++;
        if (okG && okT) byDiet[d]++;
      }
      if (!(okG && okT && okD)) continue;
      if (okTime) byCountry[S.country[i]]++;
      if (okCountry) {
        forHistogram++;
        if (okTime) count[g]++;
      }
    }

    if (forHistogram) spreadOverHistogram(histogram, S.max[i], S.min[i], forHistogram);

    const n = count.reduce((a, b) => a + b, 0);
    if (!n) continue;

    let coordinates: [number, number] = [S.lng[i], S.lat[i]];
    if (paleo) {
      const x = paleo.points[2 * i];
      const y = paleo.points[2 * i + 1];
      if (x === null || y === null) {
        noPosition += n;
        continue;
      }
      coordinates = [x / 10, y / 10];
    }
    totalFossils += n;

    features.push({
      type: "Feature",
      id: i,
      geometry: { type: "Point", coordinates },
      properties: { g: dominantGroup(count), n },
    });
  }

  return { features, totalFossils, byGroup, byType, byDiet, byCountry, histogram, noPosition };
}

// Point color: the group with the most visible fossils at the site. "Others" only if there are
// none of the three main groups (an identified theropod says more than a "Dinosauria indet.").
// Tie: the first group in GROUPS order.
export function dominantGroup(count: number[]): number {
  let g = OTHERS;
  for (let k = 0; k < OTHERS; k++) {
    if (count[k] > (g === OTHERS ? 0 : count[g])) g = k;
  }
  return g;
}

// Spreads n fossils evenly over the age range [max, min] (the exact age isn't known).
// Only the part of the range inside 252–66 Ma goes into the histogram.
export function spreadOverHistogram(hist: Float64Array, max: number, min: number, n: number): void {
  const hi = Math.min(max, MA_START);
  const lo = Math.max(min, MA_END);
  if (hi < lo) return; // range entirely outside the Mesozoic
  if (hi - lo < 1e-6) {
    const b = Math.min(MA_SPAN - 1, Math.max(0, Math.floor(MA_START - hi)));
    hist[b] += n;
    return;
  }
  const width = max - min; // proportion over the WHOLE range: whatever falls outside isn't counted
  const first = Math.max(0, Math.floor(MA_START - hi));
  const last = Math.min(MA_SPAN - 1, Math.ceil(MA_START - lo) - 1);
  for (let b = first; b <= last; b++) {
    const top = MA_START - b;
    const overlap = Math.min(hi, top) - Math.max(lo, top - 1);
    if (overlap > 0) hist[b] += (n * overlap) / width;
  }
}
