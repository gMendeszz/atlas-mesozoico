import { describe, it, expect } from "vitest";
import { limitesDosPontos } from "../src/geo.js";

describe("limitesDosPontos (enquadramento)", () => {
  it("país que cruza a linha de data não vira um enquadramento do mundo inteiro", () => {
    // Nova Zelândia: ilhas principais (~172° E) e Ilhas Chatham (-176,7°, do outro lado)
    const [[oeste], [leste]] = limitesDosPontos([
      [172.6, -43.5],
      [174.8, -41.3],
      [-176.7, -43.8],
    ]);
    expect(leste - oeste).toBeLessThan(15);
  });

  it("caso comum: caixa simples em volta dos pontos", () => {
    expect(
      limitesDosPontos([
        [-53.7, -29.7],
        [-40.5, -7.5],
      ])
    ).toEqual([
      [-53.7, -29.7],
      [-40.5, -7.5],
    ]);
  });

  it("sem pontos não há o que enquadrar", () => {
    expect(limitesDosPontos([])).toBeNull();
  });
});
