// Confere os arquivos de dados REAIS que vão pro site (public/data). Roda depois de cada
// atualização dos dados: pega arquivos fora de sincronia e problemas novos vindos do PBDB
// antes de publicar.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { prepararDados } from "../src/dados.js";
import { nomePais } from "../src/texto.js";
import { nomesBuscaveis, locaisDoNome } from "../src/busca.js";
import { GRUPOS, TIPOS, DIETAS } from "../src/constantes.js";
import { decodificarCostas } from "../src/paleo.js";

const ler = (caminho) => JSON.parse(readFileSync(new URL(`../public/data/${caminho}`, import.meta.url), "utf8"));
const bruto = ler("dinos.json");
const dados = prepararDados(bruto);
const L = dados.locais;
const nLocais = L.col.length;

describe("dinos.json", () => {
  it("todas as colunas de locais têm o mesmo tamanho", () => {
    for (const [coluna, valores] of Object.entries(L)) expect(valores, coluna).toHaveLength(nLocais);
  });

  it("a soma de fósseis por local bate com a lista de fósseis", () => {
    const soma = L.n.reduce((a, b) => a + b, 0);
    for (const [coluna, valores] of Object.entries(dados.fosseis)) expect(valores, coluna).toHaveLength(soma);
  });

  it("todo índice aponta pra uma entrada que existe no dicionário", () => {
    const conferir = (coluna, dic) => expect(Math.max(...coluna)).toBeLessThan(dic.length);
    conferir(L.pais, dados.dic.pais);
    conferir(L.estado, dados.dic.estado);
    conferir(L.intervalo, dados.dic.intervalo);
    conferir(dados.fosseis.nome, dados.dic.nome);
    conferir(dados.fosseis.familia, dados.dic.familia);
    conferir(bruto.incertos.nome, dados.dic.nome_original);
    conferir(L.formacao, dados.dic.formacao);
    conferir(dados.fosseis.autor, dados.dic.autor);
    conferir(dados.fosseis.tipo, TIPOS);
    conferir(dados.fosseis.dieta, DIETAS);
  });

  it("as listas de grupo, tipo e dieta estão na mesma ordem no site e nos dados", () => {
    expect(bruto.meta.grupos).toEqual(GRUPOS.map((g) => g.chave));
    expect(bruto.meta.tipos).toEqual(TIPOS.map((t) => t.chave));
    expect(bruto.meta.dietas).toEqual(DIETAS.map((d) => d.chave));
  });

  it("coordenadas e idades são válidas", () => {
    for (let i = 0; i < nLocais; i++) {
      expect(Math.abs(L.lat[i]), `local ${L.col[i]}`).toBeLessThanOrEqual(90);
      expect(Math.abs(L.lng[i]), `local ${L.col[i]}`).toBeLessThanOrEqual(180);
      expect(L.max[i], `local ${L.col[i]}`).toBeGreaterThanOrEqual(L.min[i]);
    }
  });

  it("os locais com coordenada impossível (conferência de 2026-11-04) continuam fora", () => {
    for (const col of [64690, 108343, 153528, 155218]) expect(L.col).not.toContain(col);
  });

  it("todo código de país tem nome em português (pega códigos novos não-ISO do PBDB, como foi o O2)", () => {
    const semNome = dados.dic.pais.filter((cc) => cc && nomePais(cc) === cc);
    expect(semNome).toEqual([]);
  });

  it("toda sugestão da busca (nomes e formações) acha pelo menos um fóssil", () => {
    const semResultado = nomesBuscaveis(dados).filter((s) => !locaisDoNome(dados, s).locais.size);
    expect(semResultado).toEqual([]);
  });

  it("identificações incertas apontam pra fósseis que existem, sem repetir", () => {
    const j = bruto.incertos.j;
    expect(new Set(j).size).toBe(j.length);
    expect(Math.max(...j)).toBeLessThan(dados.fosseis.nome.length);
  });
});

describe("épocas de continentes antigos (public/data/paleo)", () => {
  const arquivos = readdirSync(new URL("../public/data/paleo/", import.meta.url));

  it("existem todas as épocas de 70 a 250 Ma", () => {
    const epocas = arquivos.map((a) => parseInt(a)).sort((a, b) => a - b);
    expect(epocas).toEqual(Array.from({ length: 19 }, (_, k) => 70 + 10 * k));
  });

  for (const arquivo of arquivos) {
    describe(arquivo, () => {
      const p = ler(`paleo/${arquivo}`);

      it("foi gerada a partir desta mesma lista de locais", () => {
        // Se falhar: rode scripts/baixar_paleo.py depois de baixar_dados.py
        expect(p.assinatura).toBe(bruto.meta.assinatura_locais);
        expect(p.pontos).toHaveLength(2 * nLocais);
      });

      it("posições antigas estão dentro do globo", () => {
        for (let k = 0; k < p.pontos.length; k += 2) {
          if (p.pontos[k] === null) continue;
          expect(Math.abs(p.pontos[k])).toBeLessThanOrEqual(1800);
          expect(Math.abs(p.pontos[k + 1])).toBeLessThanOrEqual(900);
        }
      });

      it("os contornos viram polígonos válidos (fechados, com pelo menos 3 lados)", () => {
        for (const contorno of decodificarCostas(p.costas).features) {
          const anel = contorno.geometry.coordinates[0];
          expect(anel.length).toBeGreaterThanOrEqual(4);
          expect(anel.at(-1)).toEqual(anel[0]);
        }
      });
    });
  }
});
