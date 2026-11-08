// Busca por nome de dinossauro ou por formação geológica (lógica pura; a interface fica em
// componentes/Busca.tsx).
import { lugarDoLocal } from "./dados";
import { fmt, nFosseis } from "./texto";
import type { Dados, Ponto } from "./tipos";

export interface Achado {
  locais: Set<number>;
  fosseis: number;
  incertos: number;
}

const PREFIXO_FORMACAO = "formação ";
// "Kirtland (?)" (formação incerta no PBDB) é achada buscando "Kirtland"
const nomeBaseDaFormacao = (texto: string): string => texto.replace(/ \(\?\)$/, "");

// Sugestões: nomes usados por algum fóssil e formações com algum local ("Formação Morrison"),
// em ordem alfabética
export function nomesBuscaveis(dados: Dados): string[] {
  const nomes = [...new Set(dados.fosseis.nome)].map((idx) => dados.dic.nome[idx]);
  const formacoes = [...new Set(dados.locais.formacao)]
    .map((idx) => dados.dic.formacao[idx])
    .filter(Boolean)
    .map((t) => `Formação ${nomeBaseDaFormacao(t)}`);
  return [...new Set([...nomes, ...formacoes])].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Locais com fósseis desse nome. Sem diferenciar maiúsculas; o gênero acha as espécies
// ("Tyrannosaurus" acha "Tyrannosaurus rex"), mas não nomes que só começam igual
// ("Tyrannosaurus" não acha "Tyrannosauridae"). Se nenhum nome bate, tenta como formação,
// com ou sem a palavra "Formação" ("Morrison" e "Formação Morrison" acham o mesmo).
export function locaisDoNome(dados: Dados, texto: string): Achado {
  const alvo = texto.trim().toLowerCase();
  const vazio: Achado = { locais: new Set(), fosseis: 0, incertos: 0 };
  if (!alvo) return vazio;

  const idsNome = new Set<number>();
  dados.dic.nome.forEach((n, idx) => {
    const nn = n.toLowerCase();
    if (nn === alvo || nn.startsWith(alvo + " ")) idsNome.add(idx);
  });
  if (!idsNome.size) return locaisDaFormacao(dados, alvo) ?? vazio;

  const locais = new Set<number>();
  let fosseis = 0;
  let incertos = 0;
  const { inicio, fosseis: F } = dados;
  for (let i = 0; i < dados.locais.col.length; i++) {
    for (let j = inicio[i]; j < inicio[i + 1]; j++) {
      if (idsNome.has(F.nome[j])) {
        locais.add(i);
        fosseis++;
        if (dados.incertoDe.has(j)) incertos++;
      }
    }
  }
  return { locais, fosseis, incertos };
}

function locaisDaFormacao(dados: Dados, alvo: string): Achado | null {
  const nome = alvo.startsWith(PREFIXO_FORMACAO) ? alvo.slice(PREFIXO_FORMACAO.length).trim() : alvo;
  const idsFormacao = new Set<number>();
  dados.dic.formacao.forEach((t, idx) => {
    if (t && nomeBaseDaFormacao(t).toLowerCase() === nome) idsFormacao.add(idx);
  });
  if (!idsFormacao.size) return null;

  const L = dados.locais;
  const locais = new Set<number>();
  let fosseis = 0;
  for (let i = 0; i < L.col.length; i++) {
    if (!idsFormacao.has(L.formacao[i])) continue;
    locais.add(i);
    fosseis += L.n[i];
  }
  return { locais, fosseis, incertos: 0 };
}

// Resumo da busca em texto (aparece sob o campo e é lido por leitores de tela).
// `visiveis`: os locais achados que aparecem no mapa agora (respeitando os filtros).
export function resumoDaBusca(dados: Dados, texto: string, achado: Achado | null, visiveis: Ponto[]): string {
  if (!texto) return "";
  if (!achado?.locais.size) return `Nenhum fóssil encontrado para “${texto}”.`;
  const n = achado.locais.size;
  let info = `${texto}: ${nFosseis(achado.fosseis)} em ${n === 1 ? "1 local" : `${fmt(n)} locais`}`;
  if (achado.incertos) info += ` (${fmt(achado.incertos)} com identificação incerta)`;
  if (visiveis.length) {
    const lugares = [...new Set(visiveis.map((p) => lugarDoLocal(dados, p.id)).filter(Boolean))];
    info += `. Locais: ${lugares.slice(0, 3).join("; ")}${lugares.length > 3 ? "…" : ""}`;
  }
  const ocultos = n - visiveis.length;
  if (ocultos) info += `. ${ocultos === 1 ? "1 local está oculto" : `${fmt(ocultos)} locais estão ocultos`} pelos filtros atuais.`;
  return info;
}
