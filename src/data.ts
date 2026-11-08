// Preparation of public/data/dinos.json (columnar format: see scripts/fetch_data.py).
import { periodOfMidpoint } from "./constants";
import { LOCALE, countryName } from "./text";
import type { Data, RawData } from "./types";

export function prepareData(d: RawData): Data {
  const S = d.sites;
  const total = S.col.length;
  const start = new Uint32Array(total + 1);
  const period = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    start[i + 1] = start[i] + S.n[i];
    period[i] = periodOfMidpoint((S.max[i] + S.min[i]) / 2);
  }

  // Countries in alphabetical order; dictionary index 0 = no country (goes last)
  const countries = d.dict.country
    .map((cc, idx) => ({ idx, cc, name: cc ? countryName(cc) : "No country given" }))
    .sort((a, b) => (a.cc ? 0 : 1) - (b.cc ? 0 : 1) || a.name.localeCompare(b.name, LOCALE));

  const uncertain = d.uncertain ?? { j: [], name: [] };
  const uncertainOf = new Map(uncertain.j.map((j, k) => [j, uncertain.name[k]]));

  return { ...d, start, period, countries, uncertainOf };
}

// "State, Country" of a site (present-day name of the place)
export function placeOfSite(data: Data, i: number): string {
  const { dict, sites: S } = data;
  return [dict.state[S.state[i]], countryName(dict.country[S.country[i]])].filter(Boolean).join(", ");
}

// Downloads the data only once (the promise is kept: React may mount the app twice in
// development, and the page shouldn't download the file again because of that).
// "no-cache" = always checks with the server for a new version (304 response if there isn't one)
let dataPromise: Promise<Data> | null = null;
export function loadData(): Promise<Data> {
  dataPromise ??= fetch("data/dinos.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<RawData>;
    })
    .then(prepareData);
  return dataPromise;
}
