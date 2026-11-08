// Filtros: estado, leitura/escrita na URL e o cálculo dos pontos, contagens e histograma.
// Tudo aqui é lógica pura (sem tela nem mapa), recebendo o estado como parâmetro.
import { GRUPOS, TIPOS, DIETAS, OUTROS, MA_INICIO, MA_FIM, MA_SPAN, MA_FOLGA, type Opcao } from "./constantes";
import type { Dados, DadosBrutos, Epoca, Filtros, Ponto, Resultado } from "./tipos";

export type CampoLista = "grupos" | "tipos" | "dietas";
export type ContagemLista = "porGrupo" | "porTipo" | "porDieta";

export interface Lista {
  campo: CampoLista; // no estado dos filtros
  url: string; // parâmetro na URL
  opcoes: Opcao[];
  coluna: keyof DadosBrutos["fosseis"]; // coluna nos dados
  contagem: ContagemLista; // contagem de cada opção em Resultado
}

// Filtros de marcar/desmarcar por fóssil
export const LISTAS: Lista[] = [
  { campo: "grupos", url: "grupo", opcoes: GRUPOS, coluna: "grupo", contagem: "porGrupo" },
  { campo: "tipos", url: "tipo", opcoes: TIPOS, coluna: "tipo", contagem: "porTipo" },
  { campo: "dietas", url: "dieta", opcoes: DIETAS, coluna: "dieta", contagem: "porDieta" },
];

// Estado inicial: todo o Mesozoico, tudo marcado, todos os países, continentes atuais
export function filtrosPadrao(): Filtros {
  return {
    de: MA_INICIO,
    ate: MA_FIM,
    pais: "",
    continentes: "atuais", // visualização; "Limpar filtros" não mexe nela
    grupos: GRUPOS.map(() => true),
    tipos: TIPOS.map(() => true),
    dietas: DIETAS.map(() => true),
  };
}

// "Limpar filtros": volta ao padrão, mas mantém a visualização de continentes
export const limparFiltros = (f: Filtros): Filtros => ({ ...filtrosPadrao(), continentes: f.continentes });

export const tempoCompleto = (f: Filtros): boolean => f.de >= MA_INICIO && f.ate <= MA_FIM;

// Algum filtro ativo? (decide se o botão "Limpar filtros" aparece)
export const temFiltroAtivo = (f: Filtros): boolean =>
  !tempoCompleto(f) || Boolean(f.pais) || LISTAS.some((l) => !f[l.campo].every(Boolean));

// O fóssil j passa nos filtros de grupo, tipo e dieta?
export const fossilVisivel = (f: Filtros, F: DadosBrutos["fosseis"], j: number): boolean =>
  LISTAS.every((l) => f[l.campo][F[l.coluna][j]]);

// Lê os filtros de uma query string (?de=..&ate=..&grupo=..&tipo=..&dieta=..&pais=..&continentes=..).
// A URL pode vir editada à mão ou de um link antigo: tudo é limitado a valores válidos.
export function lerFiltrosDaURL(queryString: string): Filtros {
  const f = filtrosPadrao();
  const p = new URLSearchParams(queryString);
  for (const l of LISTAS) {
    const valor = p.get(l.url);
    if (valor === null) continue;
    const marcados = new Set(valor.split(","));
    f[l.campo] = l.opcoes.map((o) => marcados.has(o.chave));
  }
  f.pais = (p.get("pais") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  const de = parseFloat(p.get("de") ?? "");
  const ate = parseFloat(p.get("ate") ?? "");
  if (Number.isFinite(de)) f.de = Math.min(MA_INICIO, Math.max(MA_FIM + MA_FOLGA, de));
  if (Number.isFinite(ate)) f.ate = Math.max(MA_FIM, Math.min(f.de - MA_FOLGA, ate));
  if (p.get("continentes") === "antigos") f.continentes = "antigos";
  return f;
}

// O inverso: só escreve o que difere do padrão (URL curta pra compartilhar)
export function filtrosParaURL(f: Filtros): string {
  const p = new URLSearchParams();
  if (!tempoCompleto(f)) {
    p.set("de", String(f.de));
    p.set("ate", String(f.ate));
  }
  for (const l of LISTAS) {
    if (f[l.campo].every(Boolean)) continue;
    p.set(l.url, l.opcoes.filter((_, i) => f[l.campo][i]).map((o) => o.chave).join(","));
  }
  if (f.pais) p.set("pais", f.pais);
  if (f.continentes === "antigos") p.set("continentes", "antigos");
  const qs = p.toString().replaceAll("%2C", ",");
  return qs ? `?${qs}` : "";
}

/**
 * Monta os pontos visíveis, as contagens de cada opção e o histograma.
 * - Cada contagem considera os OUTROS filtros (o número ao lado de "Terópodes" respeita tempo,
 *   país, tipo e dieta, mas não o próprio filtro de grupo); o histograma ignora o filtro de tempo.
 * - Um local entra no intervalo de tempo se a faixa de idade dele CRUZA o intervalo.
 * - Com `paleo` (uma época de continentes antigos), os pontos vão pra posição daquela época;
 *   locais que o modelo não reconstrói ficam de fora e são contados em `semPosicao`.
 */
export function calcular(dados: Dados, f: Filtros, paleo: Epoca | null = null): Resultado {
  const { locais: L, fosseis: F, inicio } = dados;
  const paisIdx = f.pais ? dados.dic.pais.indexOf(f.pais) : -1;
  const porGrupo = GRUPOS.map(() => 0);
  const porTipo = TIPOS.map(() => 0);
  const porDieta = DIETAS.map(() => 0);
  const porPais = new Uint32Array(dados.dic.pais.length);
  const histograma = new Float64Array(MA_SPAN); // fósseis por milhão de anos
  const features: Ponto[] = [];
  let totalFosseis = 0;
  let semPosicao = 0;

  for (let i = 0; i < L.col.length; i++) {
    const okTempo = L.max[i] >= f.ate && L.min[i] <= f.de;
    const okPais = paisIdx < 0 || L.pais[i] === paisIdx;
    const okLocal = okTempo && okPais;
    const conta = GRUPOS.map(() => 0);
    let paraHistograma = 0;

    for (let j = inicio[i]; j < inicio[i + 1]; j++) {
      const g = F.grupo[j];
      const t = F.tipo[j];
      const d = F.dieta[j];
      const okG = f.grupos[g];
      const okT = f.tipos[t];
      const okD = f.dietas[d];
      if (okLocal) {
        if (okT && okD) porGrupo[g]++;
        if (okG && okD) porTipo[t]++;
        if (okG && okT) porDieta[d]++;
      }
      if (!(okG && okT && okD)) continue;
      if (okTempo) porPais[L.pais[i]]++;
      if (okPais) {
        paraHistograma++;
        if (okTempo) conta[g]++;
      }
    }

    if (paraHistograma) espalharNoHistograma(histograma, L.max[i], L.min[i], paraHistograma);

    const n = conta.reduce((a, b) => a + b, 0);
    if (!n) continue;

    let coordenadas: [number, number] = [L.lng[i], L.lat[i]];
    if (paleo) {
      const x = paleo.pontos[2 * i];
      const y = paleo.pontos[2 * i + 1];
      if (x === null || y === null) {
        semPosicao += n;
        continue;
      }
      coordenadas = [x / 10, y / 10];
    }
    totalFosseis += n;

    features.push({
      type: "Feature",
      id: i,
      geometry: { type: "Point", coordinates: coordenadas },
      properties: { g: grupoPredominante(conta), n },
    });
  }

  return { features, totalFosseis, porGrupo, porTipo, porDieta, porPais, histograma, semPosicao };
}

// Cor do ponto: grupo com mais fósseis visíveis no local. "Outros" só se não houver nenhum
// dos três grupos principais (um terópode identificado diz mais que um "Dinosauria indet.").
// Empate: o primeiro grupo na ordem de GRUPOS.
export function grupoPredominante(conta: number[]): number {
  let g = OUTROS;
  for (let k = 0; k < OUTROS; k++) {
    if (conta[k] > (g === OUTROS ? 0 : conta[g])) g = k;
  }
  return g;
}

// Distribui n fósseis igualmente pela faixa de idade [max, min] (a idade exata não é conhecida).
// Só a parte da faixa dentro de 252–66 Ma entra no histograma.
export function espalharNoHistograma(hist: Float64Array, max: number, min: number, n: number): void {
  const hi = Math.min(max, MA_INICIO);
  const lo = Math.max(min, MA_FIM);
  if (hi < lo) return; // faixa toda fora do Mesozoico
  if (hi - lo < 1e-6) {
    const b = Math.min(MA_SPAN - 1, Math.max(0, Math.floor(MA_INICIO - hi)));
    hist[b] += n;
    return;
  }
  const largura = max - min; // proporção sobre a faixa INTEIRA: o que cai fora não é contado
  const primeiro = Math.max(0, Math.floor(MA_INICIO - hi));
  const ultimo = Math.min(MA_SPAN - 1, Math.ceil(MA_INICIO - lo) - 1);
  for (let b = primeiro; b <= ultimo; b++) {
    const topo = MA_INICIO - b;
    const sobreposto = Math.min(hi, topo) - Math.max(lo, topo - 1);
    if (sobreposto > 0) hist[b] += (n * sobreposto) / largura;
  }
}
