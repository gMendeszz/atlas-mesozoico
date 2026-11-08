// "Sobre os dados e limitações". Os números vêm dos próprios dados, pra nunca ficarem desatualizados.
import { useMemo, type ReactNode } from "react";
import { fmt } from "../texto";
import type { Dados } from "../tipos";

// Enquanto os dados carregam, valores aproximados (os de novembro de 2026)
const PROVISORIOS = { fosseis: "22 mil", referencias: "mais de 6 mil", data: "novembro de 2026", euaCanada: "39%", incertos: "11%" };

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
    referencias: dados.meta.n_referencias ? fmt(dados.meta.n_referencias) : "milhares de",
    data: new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    euaCanada: pct(euaCanada),
    incertos: pct(dados.incertoDe.size),
  };
}

function Externo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="text-destaque">
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

export function Sobre({ dados }: { dados: Dados | null }) {
  const v = useMemo(() => (dados ? valoresDosDados(dados) : PROVISORIOS), [dados]);
  return (
    <details className="mt-3.5 border-t border-borda pt-2.5 text-xs leading-[1.45] text-suave">
      <summary className="cursor-pointer font-semibold text-texto">Sobre os dados e limitações</summary>
      <ul className="mt-1.5 list-disc pl-4 [&>li]:my-[3px]">
        <li>
          <strong>Fonte:</strong> <Externo href="https://paleobiodb.org">Paleobiology Database</Externo>, base científica
          mantida por pesquisadores desde 1998. Cada registro vem de uma publicação: estes {v.fosseis} fósseis vêm de{" "}
          {v.referencias} artigos e livros. Dados de {v.data}.
        </li>
        <li>
          <strong>O mapa mostra onde fósseis foram coletados e registrados</strong>, não onde os dinossauros viviam. Há muito
          mais pesquisa em alguns lugares: só EUA e Canadá somam {v.euaCanada} dos registros.
        </li>
        <li>
          <strong>Idades são faixas</strong>, vindas da camada de rocha onde o fóssil estava (incerteza típica de alguns
          milhões de anos).
        </li>
        <li>
          <strong>{v.incertos} das identificações são incertas</strong> na publicação original; elas aparecem marcadas no
          detalhe de cada local.
        </li>
        <li>
          <strong>Dieta é estimada pelo grupo</strong> do animal no PBDB (todo tiranossaurídeo conta como carnívoro, por
          exemplo). Quando o grupo não tem dieta definida, aparece como “sem informação”, em vez de um chute.
        </li>
        <li>
          <strong>Pegadas e ovos</strong> vêm marcados pelo PBDB como icnofósseis e ovos. Corrigimos 3 marcações erradas; a
          formação geológica é a camada de rocha onde o fóssil estava.
        </li>
        <li>
          <strong>Coordenadas são aproximadas</strong>: muitas foram estimadas a partir de mapas ou de um marco próximo.
          Corrigimos 1 coordenada errada e excluímos 4 sem dado confiável.
        </li>
        <li>
          <strong>Continentes antigos são um modelo</strong> (PALEOMAP, de Scotese): a incerteza cresce quanto mais antiga a
          época, e modelos diferentes podem divergir.
        </li>
        <li>
          <strong>Privacidade:</strong> sem cookies nem rastreamento. O mapa base vem do OpenFreeMap, que, como todo site,
          recebe o endereço IP de quem acessa.
        </li>
      </ul>
    </details>
  );
}
