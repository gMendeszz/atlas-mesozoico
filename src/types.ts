// Shared types: the format of public/data/dinos.json (see scripts/fetch_data.py), the filter
// state and the result of the calculation.
import type { Feature, FeatureCollection, Point as GeoPoint, Polygon } from "geojson";

/** public/data/dinos.json, columnar format: each field is a list, and the fossil/site is its position in it. */
export interface RawData {
  meta: {
    generated_at: string; // "2026-11-06"
    sites_signature: string; // changes when the site list changes (checked against the time slices)
    groups: string[];
    types: string[];
    diets: string[];
    n_references?: number;
    source?: string;
    license?: string;
  };
  /** Dictionaries: the text fields store an index into these. Index 0 = empty. */
  dict: {
    name: string[];
    original_name: string[];
    family: string[];
    interval: string[];
    country: string[];
    state: string[];
    formation: string[];
    author: string[];
  };
  sites: {
    col: number[]; // PBDB collection number
    lng: number[];
    lat: number[];
    max: number[]; // oldest age (Ma)
    min: number[]; // youngest age (Ma)
    interval: number[];
    country: number[];
    state: number[];
    formation: number[];
    n: number[]; // number of fossils at the site
  };
  /** Sorted by site: the fossils of site i come in sequence (see Data.start). */
  fossils: {
    name: number[];
    family: number[];
    group: number[];
    type: number[];
    diet: number[];
    author: number[];
  };
  /** Uncertain identifications: fossil j -> original text in dict.original_name */
  uncertain?: { j: number[]; name: number[] };
}

export interface Country {
  idx: number; // index in dict.country
  cc: string; // code ("BR"); "" = no country
  name: string;
}

/** Data ready for the app (prepareData): the raw data plus indexes computed once. */
export interface Data extends RawData {
  start: Uint32Array; // fossils of site i: start[i] to start[i+1]
  period: Uint8Array; // period (index in PERIODS) of the middle of each site's age
  countries: Country[]; // alphabetical, "no country" last
  uncertainOf: Map<number, number>; // fossil j -> index in dict.original_name
}

export type Continents = "present" | "ancient";
export type View = "globe" | "mercator";
export type Theme = "light" | "dark";

/** Filter state (also goes into the URL). */
export interface Filters {
  from: number; // start of the range (oldest), in Ma
  to: number; // end of the range (youngest), in Ma
  country: string; // country code or "" for all
  continents: Continents;
  groups: boolean[];
  types: boolean[];
  diets: boolean[];
}

export interface PointProperties {
  g: number; // dominant group (color)
  n: number; // visible fossils at the site
}
/** A site on the map; `id` is the site index. */
export type Point = Feature<GeoPoint, PointProperties> & { id: number };

export interface Result {
  features: Point[];
  totalFossils: number;
  byGroup: number[];
  byType: number[];
  byDiet: number[];
  byCountry: Uint32Array;
  histogram: Float64Array;
  noPosition: number; // fossils hidden because the model can't reconstruct their site
}

/** One ancient-continents time slice, already decoded. */
export interface TimeSlice {
  t: number; // millions of years ago
  points: (number | null)[]; // [lng, lat] of each site in tenths of a degree; null = no position
  coasts: FeatureCollection<Polygon>;
}
