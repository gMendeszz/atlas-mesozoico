import { describe, it, expect } from "vitest";
import { epocaDoIntervalo, decodificarCostas } from "../src/paleo";
import { PERIODOS } from "../src/constantes";

describe("epocaDoIntervalo (qual Terra antiga mostrar)", () => {
  it("usa o meio do intervalo, arredondado pra dezena", () => {
    const [triassico, , cretaceo] = PERIODOS;
    expect(epocaDoIntervalo(triassico.de, triassico.ate)).toBe(230);
    expect(epocaDoIntervalo(cretaceo.de, cretaceo.ate)).toBe(110);
    expect(epocaDoIntervalo(252, 66)).toBe(160);
  });

  it("nunca pede uma época que não existe (só há 70 a 250 Ma)", () => {
    expect(epocaDoIntervalo(68, 66)).toBe(70);
    expect(epocaDoIntervalo(252, 250)).toBe(250);
  });
});

describe("decodificarCostas", () => {
  it("soma as diferenças a partir do primeiro ponto (formato compacto do script Python)", () => {
    // (10,0) -> (+5,+5) -> (+5,-5) em décimos de grau
    const [contorno] = decodificarCostas([[100, 0, 50, 50, 50, -50]]).features;
    expect(contorno.geometry.coordinates[0].slice(0, 3)).toEqual([
      [10, 0],
      [15, 5],
      [20, 0],
    ]);
  });

  it("fecha o polígono (exigência do GeoJSON; sem isso o MapLibre desenha errado)", () => {
    const [contorno] = decodificarCostas([[100, 0, 50, 50, 50, -50]]).features;
    const anel = contorno.geometry.coordinates[0];
    expect(anel.at(-1)).toEqual(anel[0]);
  });

  it("não duplica o ponto final quando o contorno já vem fechado", () => {
    const [contorno] = decodificarCostas([[0, 0, 10, 0, 0, 10, -10, -10]]).features;
    expect(contorno.geometry.coordinates[0]).toHaveLength(4);
  });
});
