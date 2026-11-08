// Tipos compartilhados: o formato de public/data/dinos.json (ver scripts/baixar_dados.py),
// o estado dos filtros e o resultado do cálculo.
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

/** public/data/dinos.json, formato colunar: cada campo é uma lista, e o fóssil/local é a posição nela. */
export interface DadosBrutos {
  meta: {
    gerado_em: string; // "2026-11-06"
    assinatura_locais: string; // muda quando a lista de locais muda (confere com as épocas)
    grupos: string[];
    tipos: string[];
    dietas: string[];
    n_referencias?: number;
    fonte?: string;
    licenca?: string;
  };
  /** Dicionários: os campos de texto guardam o índice aqui. Índice 0 = vazio. */
  dic: {
    nome: string[];
    nome_original: string[];
    familia: string[];
    intervalo: string[];
    pais: string[];
    estado: string[];
    formacao: string[];
    autor: string[];
  };
  locais: {
    col: number[]; // nº da coleção no PBDB
    lng: number[];
    lat: number[];
    max: number[]; // idade mais antiga (Ma)
    min: number[]; // idade mais recente (Ma)
    intervalo: number[];
    pais: number[];
    estado: number[];
    formacao: number[];
    n: number[]; // nº de fósseis do local
  };
  /** Ordenados por local: os fósseis do local i vêm em sequência (ver Dados.inicio). */
  fosseis: {
    nome: number[];
    familia: number[];
    grupo: number[];
    tipo: number[];
    dieta: number[];
    autor: number[];
  };
  /** Identificações incertas: fóssil j -> texto original em dic.nome_original */
  incertos?: { j: number[]; nome: number[] };
}

export interface Pais {
  idx: number; // índice em dic.pais
  cc: string; // código ("BR"); "" = sem país
  nome: string;
}

/** Dados prontos pro app (prepararDados): os brutos mais índices calculados uma vez. */
export interface Dados extends DadosBrutos {
  inicio: Uint32Array; // fósseis do local i: inicio[i] até inicio[i+1]
  periodo: Uint8Array; // período (índice em PERIODOS) do meio da idade de cada local
  paises: Pais[]; // em ordem alfabética, "sem país" no fim
  incertoDe: Map<number, number>; // fóssil j -> índice em dic.nome_original
}

export type Continentes = "atuais" | "antigos";
export type Vista = "globe" | "mercator";
export type Tema = "claro" | "escuro";

/** Estado dos filtros (também vai pra URL). */
export interface Filtros {
  de: number; // início do intervalo (mais antigo), em Ma
  ate: number; // fim do intervalo (mais recente), em Ma
  pais: string; // código do país ou "" pra todos
  continentes: Continentes;
  grupos: boolean[];
  tipos: boolean[];
  dietas: boolean[];
}

export interface PropriedadesPonto {
  g: number; // grupo predominante (cor)
  n: number; // fósseis visíveis no local
}
/** Um local no mapa; `id` é o índice do local. */
export type Ponto = Feature<Point, PropriedadesPonto> & { id: number };

export interface Resultado {
  features: Ponto[];
  totalFosseis: number;
  porGrupo: number[];
  porTipo: number[];
  porDieta: number[];
  porPais: Uint32Array;
  histograma: Float64Array;
  semPosicao: number; // fósseis escondidos porque o modelo não reconstrói o local
}

/** Uma época de continentes antigos, já decodificada. */
export interface Epoca {
  t: number; // milhões de anos atrás
  pontos: (number | null)[]; // [lng, lat] de cada local em décimos de grau; null = sem posição
  costas: FeatureCollection<Polygon>;
}
