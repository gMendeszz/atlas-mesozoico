// Ancient continents: choosing the time slice, loading and decoding the files
// public/data/paleo/<time>.json (see scripts/fetch_paleo.py).
import type { Feature, FeatureCollection, Polygon, Position } from "geojson";
import { PALEO_FIRST, PALEO_LAST } from "./constants";
import type { TimeSlice } from "./types";

interface RawTimeSlice {
  t: number;
  signature: string;
  points: (number | null)[];
  coasts: number[][];
}

// The slice shown is the middle of the timeline range, rounded to the nearest ten
export const timeSliceForRange = (from: number, to: number): number =>
  Math.min(PALEO_LAST, Math.max(PALEO_FIRST, Math.round((from + to) / 20) * 10));

// Outlines come in tenths of a degree, with the 1st point absolute and the others as the
// difference from the previous one. Returns GeoJSON with each outline as a closed polygon.
export function decodeCoasts(coasts: number[][]): FeatureCollection<Polygon> {
  const features = coasts.map((r): Feature<Polygon> => {
    let x = r[0];
    let y = r[1];
    const ring: Position[] = [[x / 10, y / 10]];
    for (let k = 2; k < r.length; k += 2) {
      x += r[k];
      y += r[k + 1];
      ring.push([x / 10, y / 10]);
    }
    const [x0, y0] = ring[0];
    const [xn, yn] = ring[ring.length - 1];
    if (x0 !== xn || y0 !== yn) ring.push([x0, y0]);
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
  });
  return { type: "FeatureCollection", features };
}

const loadedSlices = new Map<number, Promise<TimeSlice>>(); // time -> ready data

// Downloads a time slice (only once). `signature` comes from dinos.json: the slice is only
// accepted if it was generated from exactly the same site list (otherwise points would be swapped).
export function loadTimeSlice(t: number, signature: string): Promise<TimeSlice> {
  let promise = loadedSlices.get(t);
  if (!promise) {
    // ?v=signature: each data version has its own URL, so the browser cache never mixes an
    // old time slice with a new dinos.json
    promise = fetch(`data/paleo/${t}.json?v=${encodeURIComponent(signature)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RawTimeSlice>;
      })
      .then((d) => {
        if (d.signature !== signature) throw new Error("time slice generated from another site list");
        return { t: d.t, points: d.points, coasts: decodeCoasts(d.coasts) };
      })
      .catch((error: unknown) => {
        loadedSlices.delete(t); // allows trying again later
        throw error;
      });
    loadedSlices.set(t, promise);
  }
  return promise;
}
