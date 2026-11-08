// Text and number formatting, and HTML escaping. The site is in English (numbers like 22,118).

export const LOCALE = "en-US";

// Number() guarantees only numbers become text here (never a string coming from the data)
export const fmt = (n: number): string => Number(n).toLocaleString(LOCALE);

// Millions of years with at most 1 decimal: 201.4 -> "201.4"; 145 -> "145"
export const fmtMa = (ma: number): string => (Math.round(ma * 10) / 10).toLocaleString(LOCALE);

// "1 fossil record" / "2,345 fossil records". A record (PBDB "occurrence") is one taxon at one
// site, as reported in a publication: it may be one tooth or a whole skeleton, so the site counts
// records, not bones or animals.
export const nRecords = (n: number): string => (n === 1 ? "1 fossil record" : `${fmt(n)} fossil records`);

// Escapes text before putting it inside HTML (names come from outside: never trust them).
// React already escapes on its own; this is for the map popups, which take ready-made HTML.
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// PBDB-specific codes for finds at sea (e.g. oil wells); they are not ISO
export const PBDB_OCEANS: Record<string, string> = {
  O1: "Arctic Ocean",
  O2: "North Atlantic",
  O3: "South Atlantic",
  O4: "North Pacific",
  O5: "South Pacific",
  O6: "Indian Ocean",
  O7: "Southern Ocean",
};

const regionNames = new Intl.DisplayNames([LOCALE], { type: "region" });

// Country name from the PBDB code (ISO, with exceptions)
export function countryName(cc: string): string {
  if (!cc) return "";
  if (PBDB_OCEANS[cc]) return PBDB_OCEANS[cc];
  try {
    return regionNames.of(cc) ?? cc;
  } catch {
    return cc; // unknown code: shows the code itself instead of breaking
  }
}
