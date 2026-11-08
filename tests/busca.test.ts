import { describe, it, expect } from "vitest";
import { locaisDoNome, nomesBuscaveis, resumoDaBusca } from "../src/busca";
import { calcular, filtrosPadrao } from "../src/filtros";
import { dadosDeTeste } from "./dados-de-teste";

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

describe("resumoDaBusca (texto sob o campo, lido por leitores de tela)", () => {
  const dados = dadosDeTeste();
  const pontos = (ids: number[]) => calcular(dados, filtrosPadrao()).features.filter((p) => ids.includes(p.id));

  it("sem texto, sem resumo; sem resultado, avisa", () => {
    expect(resumoDaBusca(dados, "", null, [])).toBe("");
    expect(resumoDaBusca(dados, "Xyz", locaisDoNome(dados, "Xyz"), [])).toBe("Nenhum fóssil encontrado para “Xyz”.");
  });

  it("conta fósseis, locais e incertos, e diz onde ficam", () => {
    const achado = locaisDoNome(dados, "Tyrannosaurus");
    expect(resumoDaBusca(dados, "Tyrannosaurus", achado, pontos([0]))).toBe(
      "Tyrannosaurus: 1 fóssil em 1 local (1 com identificação incerta). Locais: Rio Grande do Sul, Brasil"
    );
  });

  it("avisa quando os filtros escondem locais achados", () => {
    const achado = locaisDoNome(dados, "Dinosauria"); // locais 0 e 2
    expect(resumoDaBusca(dados, "Dinosauria", achado, pontos([2]))).toContain("1 local está oculto pelos filtros atuais.");
  });
});
