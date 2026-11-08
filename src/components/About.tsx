// "About the data and limitations". The numbers come from the data itself, so they never go stale.
import { useMemo, type ReactNode } from "react";
import { LOCALE, fmt } from "../text";
import { LABEL } from "./classes";
import { ChevronIcon } from "./Icons";
import type { Data } from "../types";

// While the data loads, approximate values (those from November 2026)
const PLACEHOLDERS = { fossils: "22,000", references: "over 6,000", date: "November 2026", usCanada: "39%", uncertain: "11%" };

function valuesFromData(data: Data) {
  const total = data.fossils.name.length;
  const pct = (n: number) => `${Math.round((100 * n) / total)}%`;
  let usCanada = 0;
  data.sites.country.forEach((c, i) => {
    if (["US", "CA"].includes(data.dict.country[c])) usCanada += data.sites.n[i];
  });
  const [year, month, day] = data.meta.generated_at.split("-").map(Number);
  return {
    fossils: fmt(total),
    references: data.meta.n_references ? fmt(data.meta.n_references) : "thousands of",
    date: new Date(year, month - 1, day).toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" }),
    usCanada: pct(usCanada),
    uncertain: pct(data.uncertainOf.size),
  };
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="text-accent">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function About({ data }: { data: Data | null }) {
  const v = useMemo(() => (data ? valuesFromData(data) : PLACEHOLDERS), [data]);
  return (
    <details className="group mt-3.5 border-t border-line text-xs leading-[1.45] text-muted">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <ChevronIcon className="flex-none transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
        <span className={LABEL}>About the data and limitations</span>
      </summary>
      <ul className="list-disc pl-4 [&>li]:my-[3px]">
        <li>
          <strong>Source:</strong> the <External href="https://paleobiodb.org">Paleobiology Database</External> (PBDB), a
          scientific database maintained by researchers since 1998. Every record comes from a publication: these{" "}
          {v.fossils} fossil records come from {v.references} papers and books (
          <External href="https://paleobiodb.org/data1.2/occs/refs.csv?base_name=Dinosauria&interval=Mesozoic&show=formatted">full list of references</External>, from the PBDB API). Each site links
          to its PBDB collection page, with its references and contributors.
        </li>
        <li>
          <strong>How to cite:</strong> data downloaded from the Paleobiology Database on {v.date}, using the group name
          Dinosauria and the time interval Mesozoic. A few records were corrected or reclassified (see the project’s
          README for each change).
        </li>
        <li>
          <strong>The numbers count fossil records, not bones or animals.</strong> Each record is one taxon at one
          site, as reported in a publication: it may be a single tooth or a whole skeleton. When the same name shows up
          several times at a site (e.g. “Theropoda ×13”), the publication described that many different animals or
          forms; the name it was published under is shown when it says more than the accepted name.
        </li>
        <li>
          <strong>Birds are dinosaurs:</strong> Mesozoic birds (such as <em>Confuciusornis</em>) are theropods. Here
          they get their own group so they don’t blend in with the other theropods.
        </li>
        <li>
          <strong>The map shows where fossils were collected and recorded</strong>, not where dinosaurs lived. Some places
          have been studied far more than others: the US and Canada alone account for {v.usCanada} of the records.
        </li>
        <li>
          <strong>Ages are ranges</strong>, taken from the rock layer where the fossil was found (typically uncertain by a
          few million years).
        </li>
        <li>
          <strong>{v.uncertain} of the identifications are uncertain</strong> in the original publication; they are flagged in
          each site’s details.
        </li>
        <li>
          <strong>Diet is inferred from the group</strong> the animal belongs to in the PBDB (every tyrannosaurid counts as a
          carnivore, for example). When the group has no diet recorded, it shows as “unknown” rather than a guess.
        </li>
        <li>
          <strong>Footprints and eggs</strong> are flagged by the PBDB as trace fossils and eggs; 3 wrong flags were
          corrected. The geological formation is the rock layer where the fossil was found.
        </li>
        <li>
          <strong>Coordinates are approximate</strong>: many were estimated from maps or a nearby landmark. 1 wrong
          coordinate was corrected and 4 sites with no reliable data were removed.
        </li>
        <li>
          <strong>Ancient continents are a model</strong> (Scotese’s PALEOMAP, CC BY 4.0, reconstructed with the GPlates
          Web Service; outlines simplified for the web): uncertainty grows the further back in time, and different models
          can disagree.
        </li>
        <li>
          <strong>Privacy:</strong> no cookies, analytics or tracking. Like any website, the hosting (GitHub Pages) and
          the base map (OpenFreeMap, which may use the Cloudflare network) receive the visitor’s IP address.
        </li>
        <li>
          <strong>Open source:</strong> built with React, MapLibre GL JS and other libraries (
          <External href="third-party-licenses.txt">their licenses</External>). Base map © OpenFreeMap, OpenMapTiles,
          OpenStreetMap contributors.
        </li>
      </ul>
    </details>
  );
}
