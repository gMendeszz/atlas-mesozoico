// HTML dos popups do mapa. Os popups do MapLibre recebem HTML pronto (fora da árvore do React),
// então todo texto vindo dos dados passa por esc() antes de virar HTML.
import { GRUPOS, TIPOS, PERIODOS } from "./constantes";
import { esc, fmt, nFosseis } from "./texto";
import { lugarDoLocal } from "./dados";
import { fossilVisivel } from "./filtros";
import type { Dados, Filtros } from "./tipos";

const TEXTO_INCERTO =
  "A publicação original não tem certeza da identificação (cf. = parecido com; ? = duvidoso; aff. = aparentado)";

// Um fóssil da lista: nome (com autor e ano), família e marcas de tipo e de incerteza
function itemDoFossil(dados: Dados, j: number): string {
  const { dic, fosseis: F } = dados;
  const g = GRUPOS[F.grupo[j]];
  const familia = dic.familia[F.familia[j]];
  const tipo = TIPOS[F.tipo[j]];
  // Identificação incerta: mostra o texto original da publicação ("cf. Tyrannosaurus rex") e
  // não mostra o autor do nome aceito, que daria a entender uma certeza que não existe
  const original = dados.incertoDe.get(j);
  const incerto = original !== undefined;
  const nome = incerto ? dic.nome_original[original] : dic.nome[F.nome[j]];
  const autor = incerto ? "" : dic.autor[F.autor[j]];

  let marcas = "";
  if (tipo.curto) marcas += ` <small class="tipo-fossil">${tipo.curto}</small>`;
  if (incerto) marcas += ` <small class="incerto" title="${TEXTO_INCERTO}">identificação incerta</small>`;
  return `<li><span class="bola" style="--cor:${g.cor};--cor-escura:${g.corEscura}" title="${g.nome}"></span>
      <span><em>${esc(nome)}</em>${autor ? ` <span class="autor">${esc(autor)}</span>` : ""}${familia ? ` <small>${esc(familia)}</small>` : ""}${marcas}</span></li>`;
}

// Detalhes de um local: lugar, idade, formação e a lista de fósseis que passam nos filtros.
// `f` é o estado dos filtros (grupo, tipo, dieta e o modo de continentes).
export function htmlDoLocal(dados: Dados, i: number, f: Filtros): string {
  const { dic, locais: L, inicio, periodo } = dados;
  const lugar = lugarDoLocal(dados, i);
  const formacao = dic.formacao[L.formacao[i]];

  let itens = "";
  let visiveis = 0;
  for (let j = inicio[i]; j < inicio[i + 1]; j++) {
    if (!fossilVisivel(f, dados.fosseis, j)) continue;
    visiveis++;
    itens += itemDoFossil(dados, j);
  }
  const ocultos = L.n[i] - visiveis;

  // No modo de continentes antigos, deixa claro que o nome é da localização atual
  const prefixo = f.continentes === "antigos" ? "Hoje: " : "";
  return `<strong class="pop-lugar">${prefixo}${esc(lugar || "Local sem nome")}</strong>
    <div>${PERIODOS[periodo[i]].nome} · ${esc(dic.intervalo[L.intervalo[i]])}</div>
    <div>${fmt(L.max[i])}–${fmt(L.min[i])} milhões de anos</div>
    ${formacao ? `<div>Formação ${esc(formacao)}</div>` : ""}
    <div class="pop-n">${nFosseis(visiveis)}
      ${ocultos ? `<span class="pop-ocultos">· +${fmt(ocultos)} escondidos pelos filtros</span>` : ""}</div>
    <ul class="pop-lista">${itens}</ul>
    <a href="https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${encodeURIComponent(L.col[i])}"
       target="_blank" rel="noopener">Ver coleção no PBDB <span aria-hidden="true">↗</span><span class="sr-only">(abre em nova aba)</span></a>`;
}

// Resumo curto ao passar o mouse sobre um local
export function htmlDica(dados: Dados, i: number, n: number): string {
  return `<strong>${esc(lugarDoLocal(dados, i) || "Local sem nome")}</strong><br>${nFosseis(n)} · clique para ver`;
}
