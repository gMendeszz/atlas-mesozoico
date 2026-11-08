// "About the data and limitations". Os números vêm dos próprios dados, pra nunca ficarem desatualizados.
import { useMemo, type ReactNode } from "react";
import { IDIOMA, fmt } from "../texto";
import { ROTULO } from "./classes";
import { IconeChevron } from "./Icones";
import type { Dados } from "../tipos";

// Enquanto os dados carregam, valores aproximados (os de novembro de 2026)
const PROVISORIOS = { fosseis: "22,000", referencias: "over 6,000", data: "November 2026", euaCanada: "39%", incertos: "11%" };

function valoresDosDados(dados: Dados) {
  const total = dados.fosseis.nome.length;
  const pct = (n: number) => `${Math.round((100 * n) / total)}%`;
  let euaCanada = 0;
  dados.locais.pais.forEach((p, i) => {
    if (["US", "CA"].includes(dados.dic.pais[p])) euaCanada += dados.locais.n[i];
  });
  const [ano, mes, dia] = dados.meta.gerado_em.split("-").map(Number);
  return {
    fosseis: fmt(total),
    referencias: dados.meta.n_referencias ? fmt(dados.meta.n_referencias) : "thousands of",
    data: new Date(ano, mes - 1, dia).toLocaleDateString(IDIOMA, { day: "numeric", month: "long", year: "numeric" }),
    euaCanada: pct(euaCanada),
    incertos: pct(dados.incertoDe.size),
  };
}

function Externo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="text-destaque">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function Sobre({ dados }: { dados: Dados | null }) {
  const v = useMemo(() => (dados ? valoresDosDados(dados) : PROVISORIOS), [dados]);
  return (
    <details className="group mt-3.5 border-t border-borda text-xs leading-[1.45] text-suave">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <IconeChevron className="flex-none transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
        <span className={ROTULO}>About the data and limitations</span>
      </summary>
      <ul className="list-disc pl-4 [&>li]:my-[3px]">
        <li>
          <strong>Source:</strong> the <Externo href="https://paleobiodb.org">Paleobiology Database</Externo>, a scientific
          database maintained by researchers since 1998. Every record comes from a publication: these {v.fosseis} fossils
          come from {v.referencias} papers and books. Data from {v.data}.
        </li>
        <li>
          <strong>The map shows where fossils were collected and recorded</strong>, not where dinosaurs lived. Some places
          have been studied far more than others: the US and Canada alone account for {v.euaCanada} of the records.
        </li>
        <li>
          <strong>Ages are ranges</strong>, taken from the rock layer where the fossil was found (typically uncertain by a
          few million years).
        </li>
        <li>
          <strong>{v.incertos} of the identifications are uncertain</strong> in the original publication; they are flagged in
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
          <strong>Ancient continents are a model</strong> (Scotese’s PALEOMAP): uncertainty grows the further back in time,
          and different models can disagree.
        </li>
        <li>
          <strong>Privacy:</strong> no cookies or tracking. The base map comes from OpenFreeMap, which, like any website,
          receives the visitor’s IP address.
        </li>
      </ul>
    </details>
  );
}
