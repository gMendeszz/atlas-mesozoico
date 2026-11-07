import { describe, it, expect } from "vitest";
import { locaisDoNome, nomesBuscaveis } from "../src/busca.js";
import { dadosDeTeste } from "./dados-de-teste.js";

describe("locaisDoNome", () => {
  it("buscar o gênero acha as espécies", () => {
    expect([...locaisDoNome(dadosDeTeste(), "Tyrannosaurus").locais]).toEqual([0]);
  });

  it("não confunde gênero com família que começa igual (Tyrannosaurus ≠ Tyrannosauridae)", () => {
    const dados = dadosDeTeste();
    dados.fosseis.nome[3] = 2; // um fóssil do local 1 vira "Tyrannosauridae"
    expect([...locaisDoNome(dados, "Tyrannosaurus").locais]).toEqual([0]);
  });

  it("ignora maiúsculas e espaços nas pontas", () => {
    expect(locaisDoNome(dadosDeTeste(), "  tyrannosaurus REX ").fosseis).toBe(1);
  });

  it("informa quantos dos achados têm identificação incerta", () => {
    expect(locaisDoNome(dadosDeTeste(), "Tyrannosaurus rex").incertos).toBe(1);
  });

  it("um nome inexistente não acha nada (e não quebra)", () => {
    expect(locaisDoNome(dadosDeTeste(), "Pikachu").locais.size).toBe(0);
    expect(locaisDoNome(dadosDeTeste(), "").locais.size).toBe(0);
  });
});

describe("busca por formação geológica", () => {
  it("acha com ou sem a palavra Formação, sem diferenciar maiúsculas", () => {
    expect([...locaisDoNome(dadosDeTeste(), "Formação Santa Maria").locais]).toEqual([0]);
    expect([...locaisDoNome(dadosDeTeste(), "santa maria").locais]).toEqual([0]);
  });

  it("acha também os locais onde a formação é incerta no PBDB", () => {
    const achado = locaisDoNome(dadosDeTeste(), "Hell Creek");
    expect([...achado.locais]).toEqual([1]);
    expect(achado.fosseis).toBe(3);
  });

  it("nome de dinossauro tem prioridade sobre formação", () => {
    const dados = dadosDeTeste();
    dados.dic.formacao[1] = "Tyrannosaurus rex"; // formação com nome igual ao de um fóssil
    expect(locaisDoNome(dados, "Tyrannosaurus rex").fosseis).toBe(1);
  });
});

describe("nomesBuscaveis (sugestões da busca)", () => {
  it("só sugere nomes que de fato têm fósseis", () => {
    // Bug que existia: textos originais incertos ("? Abelisauria indet.") apareciam nas
    // sugestões e, escolhidos, não achavam nada.
    const sugestoes = nomesBuscaveis(dadosDeTeste());
    expect(sugestoes).not.toContain("Tyrannosauridae"); // está no dicionário, sem fóssil
    expect(sugestoes).not.toContain("cf. Tyrannosaurus rex"); // texto original incerto
    expect(sugestoes).toContain("Tyrannosaurus rex");
  });

  it('sugere cada formação uma vez, sem o "(?)" de incerta', () => {
    const sugestoes = nomesBuscaveis(dadosDeTeste());
    expect(sugestoes).toContain("Formação Santa Maria");
    expect(sugestoes).toContain("Formação Hell Creek");
    expect(sugestoes.filter((s) => s.startsWith("Formação"))).toHaveLength(2);
  });
});
