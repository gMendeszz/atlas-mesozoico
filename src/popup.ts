// HTML for the map popups. MapLibre popups take ready-made HTML (outside the React tree),
// so all text coming from the data goes through esc() before becoming HTML.
import { GROUPS, TYPES, PERIODS } from "./constants";
import { esc, fmt, nRecords } from "./text";
import { placeOfSite } from "./data";
import { fossilVisible } from "./filters";
import type { Data, Filters } from "./types";

const UNCERTAIN_TEXT =
  "The original publication is unsure of this identification (cf. = compare with; ? = doubtful; aff. = related to)";

// Name shown for record j, and whether the accepted name's author fits it:
// - uncertain identification: the publication's original text ("cf. Tyrannosaurus rex"), no
//   author (it would suggest a certainty that doesn't exist)
// - published with a more specific label ("Theropoda indet. A", "Iguanodon mantelli"): that
//   label, which tells apart records that share the same accepted name
// - published as a synonym ("Gorgosaurus sternbergi", now "Gorgosaurus libratus"): the accepted
//   name, with the published one as a note
export function displayName(data: Data, j: number): { name: string; author: string; publishedAs: string; uncertain: boolean } {
  const { dict, fossils: F } = data;
  const accepted = dict.name[F.name[j]];
  const author = dict.author[F.author[j]];
  const original = data.uncertainOf.get(j);
  if (original !== undefined) return { name: dict.original_name[original], author: "", publishedAs: "", uncertain: true };
  const pubIdx = data.publishedOf.get(j);
  const published = pubIdx === undefined ? "" : dict.original_name[pubIdx];
  if (published.startsWith(accepted + " ")) return { name: published, author: "", publishedAs: "", uncertain: false };
  return { name: accepted, author, publishedAs: published, uncertain: false };
}

// One line of the list: name (with author and year), family, type and uncertainty tags
function fossilItem(data: Data, j: number): string {
  const { dict, fossils: F } = data;
  const g = GROUPS[F.group[j]];
  const family = dict.family[F.family[j]];
  const type = TYPES[F.type[j]];
  const { name, author, publishedAs, uncertain } = displayName(data, j);
  // Identified only to family level ("Ceratopsidae"): the family would just repeat the name
  const showFamily = family && family !== name;

  let tags = "";
  if (publishedAs) tags += ` <small class="published-as">published as <em>${esc(publishedAs)}</em></small>`;
  if (type.short) tags += ` <small class="fossil-type">${type.short}</small>`;
  if (uncertain) tags += ` <small class="uncertain" title="${UNCERTAIN_TEXT}">uncertain identification</small>`;
  return `<span class="dot" style="--color:${g.color};--dark-color:${g.darkColor}" title="${g.name}"></span>
      <span><em>${esc(name)}</em>${author ? ` <span class="author">${esc(author)}</span>` : ""}${showFamily ? ` <small>${esc(family)}</small>` : ""}${tags}</span>`;
}

// Site details: place, age, formation and the list of records that pass the filters.
// Identical lines (same name, family and tags) are grouped as "×3".
// `f` is the filter state (group, type, diet and the continents mode).
export function siteHtml(data: Data, i: number, f: Filters): string {
  const { dict, sites: S, start, period } = data;
  const place = placeOfSite(data, i);
  const formation = dict.formation[S.formation[i]];

  const lines = new Map<string, number>(); // line HTML -> how many records
  let visible = 0;
  for (let j = start[i]; j < start[i + 1]; j++) {
    if (!fossilVisible(f, data.fossils, j)) continue;
    visible++;
    const line = fossilItem(data, j);
    lines.set(line, (lines.get(line) ?? 0) + 1);
  }
  const items = [...lines]
    .map(([line, n]) => `<li>${line}${n > 1 ? ` <small class="repeat" title="${n} records">×${n}</small>` : ""}</li>`)
    .join("");
  const hidden = S.n[i] - visible;

  // In ancient-continents mode, makes it clear the name is the present-day location
  const prefix = f.continents === "ancient" ? "Today: " : "";
  return `<strong class="pop-place">${prefix}${esc(place || "Unnamed site")}</strong>
    <div>${PERIODS[period[i]].name} · ${esc(dict.interval[S.interval[i]])}</div>
    <div>${fmt(S.max[i])}–${fmt(S.min[i])} million years ago</div>
    ${formation ? `<div>${esc(formation)} Formation</div>` : ""}
    <div class="pop-count">${nRecords(visible)}
      ${hidden ? `<span class="pop-hidden">· +${fmt(hidden)} hidden by filters</span>` : ""}</div>
    <ul class="pop-list">${items}</ul>
    <a href="https://paleobiodb.org/classic/displayCollectionDetails?collection_no=${encodeURIComponent(S.col[i])}"
       target="_blank" rel="noopener">View collection on the PBDB <span aria-hidden="true">↗</span><span class="sr-only">(opens in a new tab)</span></a>`;
}

// Short summary on hovering a site
export function tooltipHtml(data: Data, i: number, n: number): string {
  return `<strong>${esc(placeOfSite(data, i) || "Unnamed site")}</strong><br>${nRecords(n)} · click for details`;
}
