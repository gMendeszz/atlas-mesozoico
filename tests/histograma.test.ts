import { describe, it, expect } from "vitest";
import { espalharNoHistograma } from "../src/filtros";
import { caminhoHistograma } from "../src/histograma";
import { MA_SPAN } from "../src/constantes";

const novo = () => new Float64Array(MA_SPAN);
const soma = (h: Float64Array) => h.reduce((a, b) => a + b, 0);

describe("espalharNoHistograma", () => {
  it("conserva o total quando a faixa está dentro do Mesozoico", () => {
    const h = novo();
    espalharNoHistograma(h, 230, 220.5, 7);
    expect(soma(h)).toBeCloseTo(7, 9);
  });

  it("distribui por igual ao longo da faixa (a idade exata não é conhecida)", () => {
    const h = novo();
    espalharNoHistograma(h, 230, 220, 10); // 10 Ma de faixa -> 1 por milhão de anos
    const usados = [...h].filter((v) => v > 0);
    expect(usados).toHaveLength(10);
    for (const v of usados) expect(v).toBeCloseTo(1, 9);
  });

  it("faixa que passa do fim do Mesozoico só conta a parte de dentro", () => {
    // 72,2–61,66 Ma: só (72,2 − 66) / (72,2 − 61,66) ≈ 59% dessa faixa é Mesozoico.
    // Bug que existia: o fóssil inteiro era jogado nos últimos 6 Ma do Cretáceo.
    const h = novo();
    espalharNoHistograma(h, 72.2, 61.66, 1);
    expect(soma(h)).toBeCloseTo((72.2 - 66) / (72.2 - 61.66), 9);
  });

  it("idade exata (faixa de largura zero) vai inteira pro milhão de anos certo", () => {
    const h = novo();
    espalharNoHistograma(h, 100, 100, 3);
    expect(soma(h)).toBe(3);
    expect(h[252 - 100]).toBe(3);
  });

  it("faixa toda fora do Mesozoico não entra", () => {
    const h = novo();
    espalharNoHistograma(h, 60, 50, 5);
    expect(soma(h)).toBe(0);
  });
});

describe("caminhoHistograma", () => {
  it("sem fósseis, desenha uma linha reta no chão (não quebra dividindo por zero)", () => {
    expect(caminhoHistograma(novo())).not.toMatch(/NaN|Infinity/);
  });

  it("o milhão de anos com mais fósseis encosta no topo do desenho", () => {
    const h = novo();
    h[10] = 50;
    h[20] = 5;
    expect(caminhoHistograma(h)).toContain("L10,2.0L11,2.0");
  });
});
