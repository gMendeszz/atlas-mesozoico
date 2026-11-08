// HTML for the map popups. MapLibre popups take ready-made HTML (outside the React tree),
// so all text coming from the data goes through esc() before becoming HTML.
import { GROUPS, TYPES, PERIODS } from "./constants";
import { esc, fmt, nFossils } from "./text";
import { placeOfSite } from "./data";
import { fossilVisible } from "./filters";
import type { Data, Filters } from "./types";

const UNCERTAIN_TEXT =
  "The original publication is unsure of this identification (cf. = compare with; ? = doubtful; aff. = related to)";

// One fossil in the list: name (with author and year), family, and type and uncertainty tags
function fossilItem(data: Data, j: number): string {
  const { dict, fossils: F } = data;
  const g = GROUPS[F.group[j]];
  const family = dict.family[F.family[j]];
  const type = TYPES[F.type[j]];
  // Uncertain identification: shows the publication's original text ("cf. Tyrannosaurus rex")
  // and not the accepted name's author, which would suggest a certainty that doesn't exist
  const original = data.uncertainOf.get(j);
  const uncertain = original !== undefined;
  const name = uncertain ? dict.original_name[original] : dict.name[F.name[j]];
  const author = uncertain ? "" : dict.author[F.author[j]];

  let tags = "";
  if (type.short) tags += ` <small class="fossil-type">${type.short}</small>`;
  if (uncertain) tags += ` <small class="uncertain" title="${UNCERTAIN_TEXT}">uncertain identification</small>`;
  return `<li><span class="dot" style="--color:${g.color};--dark-color:${g.darkColor}" title="${g.name}"></span>
      <span><em>${esc(name)}</em>${author ? ` <span class="author">${esc(author)}</span>` : ""}${family ? ` <small>${esc(family)}</small>` : ""}${tags}</span></li>`;
}

// Site details: place, age, formation and the list of fossils that pass the filters.
// `f` is the filter state (group, type, diet and the continents mode).
export function siteHtml(data: Data, i: number, f: Filters): string {
  const { dict, sites: S, start, period } = data;
  const place = placeOfSite(data, i);
  const formation = dict.formation[S.formation[i]];

  let items = "";
  let visible = 0;
  for (let j = start[i]; j < start[i + 1]; j++) {
    if (!fossilVisible(f, data.fossils, j)) continue;
    visible++;
    items += fossilItem(data, j);
  }
  const hidden = S.n[i] - visible;

  // In ancient-continents mode, makes it clear the name is the present-day location
  const prefix = f.continents === "ancient" ? "Today: " : "";
  return `<strong class="pop-place">${prefix}${esc(place || "Unnamed site")}</strong>
    <div>${PERIODS[period[i]].name} · ${esc(dict.interval[S.interval[i]])}</div>
    <div>${fmt(S.max[i])}–${fmt(S.min[i])} million years ago</div>
    ${formation ? `<div>${esc(formation)} Formation</div>` : ""}
    <div class="pop-count">${nFossils(visible)}
      ${hidden ? `<span class="pop-hidden">· +${fmt(hidden)} hidden by filters</span>` : ""}</div>
    <ul class="pop-list">${items}</ul>
    <a href="https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${encodeURIComponent(S.col[i])}"
       target="_blank" rel="noopener">View collection on the PBDB <span aria-hidden="true">↗</span><span class="sr-only">(opens in a new tab)</span></a>`;
}

// Short summary on hovering a site
export function tooltipHtml(data: Data, i: number, n: number): string {
  return `<strong>${esc(placeOfSite(data, i) || "Unnamed site")}</strong><br>${nFossils(n)} · click for details`;
}
