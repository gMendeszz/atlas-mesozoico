// Search by dinosaur name or geological formation (pure logic; the UI is in components/Search.tsx).
import { placeOfSite } from "./data";
import { LOCALE, fmt, nFossils } from "./text";
import type { Data, Point } from "./types";

export interface Match {
  sites: Set<number>;
  fossils: number;
  uncertain: number;
}

const FORMATION_SUFFIX = " formation";
// "Kirtland (?)" (uncertain formation in the PBDB) is found by searching "Kirtland"
const formationBaseName = (text: string): string => text.replace(/ \(\?\)$/, "");

// Suggestions: names used by some fossil and formations with some site ("Morrison Formation"),
// in alphabetical order
export function searchableNames(data: Data): string[] {
  const names = [...new Set(data.fossils.name)].map((idx) => data.dict.name[idx]);
  const formations = [...new Set(data.sites.formation)]
    .map((idx) => data.dict.formation[idx])
    .filter(Boolean)
    .map((t) => `${formationBaseName(t)} Formation`);
  return [...new Set([...names, ...formations])].filter(Boolean).sort((a, b) => a.localeCompare(b, LOCALE));
}

// Sites with fossils of this name. Case-insensitive; the genus finds its species
// ("Tyrannosaurus" finds "Tyrannosaurus rex"), but not names that just start the same way
// ("Tyrannosaurus" doesn't find "Tyrannosauridae"). If no name matches, tries it as a formation,
// with or without the word "Formation" ("Morrison" and "Morrison Formation" find the same).
export function sitesForName(data: Data, text: string): Match {
  const target = text.trim().toLowerCase();
  const empty: Match = { sites: new Set(), fossils: 0, uncertain: 0 };
  if (!target) return empty;

  const nameIds = new Set<number>();
  data.dict.name.forEach((n, idx) => {
    const nn = n.toLowerCase();
    if (nn === target || nn.startsWith(target + " ")) nameIds.add(idx);
  });
  if (!nameIds.size) return sitesForFormation(data, target) ?? empty;

  const sites = new Set<number>();
  let fossils = 0;
  let uncertain = 0;
  const { start, fossils: F } = data;
  for (let i = 0; i < data.sites.col.length; i++) {
    for (let j = start[i]; j < start[i + 1]; j++) {
      if (nameIds.has(F.name[j])) {
        sites.add(i);
        fossils++;
        if (data.uncertainOf.has(j)) uncertain++;
      }
    }
  }
  return { sites, fossils, uncertain };
}

function sitesForFormation(data: Data, target: string): Match | null {
  const name = target.endsWith(FORMATION_SUFFIX) ? target.slice(0, -FORMATION_SUFFIX.length).trim() : target;
  const formationIds = new Set<number>();
  data.dict.formation.forEach((t, idx) => {
    if (t && formationBaseName(t).toLowerCase() === name) formationIds.add(idx);
  });
  if (!formationIds.size) return null;

  const S = data.sites;
  const sites = new Set<number>();
  let fossils = 0;
  for (let i = 0; i < S.col.length; i++) {
    if (!formationIds.has(S.formation[i])) continue;
    sites.add(i);
    fossils += S.n[i];
  }
  return { sites, fossils, uncertain: 0 };
}

// Search summary as text (shown under the field and read by screen readers).
// `visible`: the matched sites that are on the map right now (respecting the filters).
export function searchSummary(data: Data, text: string, match: Match | null, visible: Point[]): string {
  if (!text) return "";
  if (!match?.sites.size) return `No fossils found for “${text}”.`;
  const n = match.sites.size;
  let info = `${text}: ${nFossils(match.fossils)} at ${n === 1 ? "1 site" : `${fmt(n)} sites`}`;
  if (match.uncertain) info += ` (${fmt(match.uncertain)} with uncertain identification)`;
  if (visible.length) {
    const places = [...new Set(visible.map((p) => placeOfSite(data, p.id)).filter(Boolean))];
    info += `. Sites: ${places.slice(0, 3).join("; ")}${places.length > 3 ? "…" : ""}`;
  }
  const hidden = n - visible.length;
  if (hidden) info += `. ${hidden === 1 ? "1 site is" : `${fmt(hidden)} sites are`} hidden by the current filters.`;
  return info;
}
