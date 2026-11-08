// The site list: a keyboard and screen-reader alternative to the map (pure logic; the UI is in
// components/SiteList.tsx).
import type { Match } from "./search";
import type { Point } from "./types";

// Sites to list: the visible ones (respecting the filters), or only the search matches when a
// search is active. Most records first, so the most important sites come up first; ties keep the
// data order (stable).
export function sitesForList(features: Point[], match: Match | null): Point[] {
  const sites = match ? features.filter((p) => match.sites.has(p.id)) : features;
  return [...sites].sort((a, b) => b.properties.n - a.properties.n || a.id - b.id);
}
