import { describe, it, expect } from "vitest";
import { calcular, filtrosPadrao, grupoPredominante, lerFiltrosDaURL, filtrosParaURL, limparFiltros } from "../src/filtros";
import { dadosDeTeste } from "./dados-de-teste";
import type { Epoca, Filtros } from "../src/tipos";

const somar = (lista: ArrayLike<number>) => Array.from(lista).reduce((a, b) => a + b, 0);

describe("calcular: filtro de tempo", () => {
  it("inclui um local cuja faixa de idade só cruza o intervalo (não precisa caber inteira)", () => {
    // Local 1 é de 72,2–61,66 Ma: começa no Cretáceo e termina depois dele
    const f = { ...filtrosPadrao(), de: 70, ate: 66 };
    const ids = calcular(dadosDeTeste(), f).features.map((p) => p.id);
    expect(ids).toEqual([1]);
  });

  it("exclui locais totalmente fora do intervalo", () => {
    const f = { ...filtrosPadrao(), de: 139, ate: 100 };
    expect(calcular(dadosDeTeste(), f).features).toHaveLength(0);
  });
});

describe("calcular: contagens de cada opção", () => {
  it("o número de cada grupo ignora o próprio filtro de grupo (mostra quanto você teria ao marcá-lo)", () => {
    const f = { ...filtrosPadrao(), grupos: [true, false, false, false] };
    const r = calcular(dadosDeTeste(), f);
    expect(r.porGrupo).toEqual([2, 1, 1, 3]); // todos os grupos contados...
    expect(r.totalFosseis).toBe(2); // ...mas no mapa só os terópodes
  });

  it("o número de cada grupo respeita país e tempo", () => {
    const r = calcular(dadosDeTeste(), { ...filtrosPadrao(), pais: "BR" });
    expect(r.porGrupo).toEqual([1, 0, 0, 2]);
  });

  it("o número de cada país ignora o filtro de país, mas respeita grupo", () => {
    const dados = dadosDeTeste();
    const r = calcular(dados, { ...filtrosPadrao(), pais: "BR", grupos: [false, true, true, false] });
    expect(r.porPais[dados.dic.pais.indexOf("US")]).toBe(2);
    expect(r.porPais[dados.dic.pais.indexOf("BR")]).toBe(0);
  });

  it("o tamanho de cada ponto (n) conta só os fósseis dos grupos marcados", () => {
    const r = calcular(dadosDeTeste(), { ...filtrosPadrao(), grupos: [false, false, false, true] });
    expect(r.features.find((p) => p.id === 0)?.properties.n).toBe(2);
    expect(r.features.find((p) => p.id === 1)).toBeUndefined(); // local 1 não tem "outros"
  });
});

describe("calcular: tipo de fóssil e dieta", () => {
  it("só pegadas: mostra a pegada e conta os outros tipos sem filtrar por tipo", () => {
    const r = calcular(dadosDeTeste(), { ...filtrosPadrao(), tipos: [false, true, false] });
    expect(r.totalFosseis).toBe(1);
    expect(r.features.map((p) => p.id)).toEqual([0]);
    expect(r.porTipo).toEqual([5, 1, 1]);
  });

  it("o filtro de dieta muda as contagens dos outros filtros", () => {
    const r = calcular(dadosDeTeste(), { ...filtrosPadrao(), dietas: [true, false, false, false, false] });
    expect(r.totalFosseis).toBe(2); // os 2 carnívoros
    expect(r.porGrupo).toEqual([2, 0, 0, 0]);
    expect(r.porTipo).toEqual([2, 0, 0]);
    expect(r.porDieta).toEqual([2, 2, 0, 0, 3]); // a própria contagem ignora o filtro de dieta
  });
});

describe("grupoPredominante (cor do ponto)", () => {
  it('"Outros" só vence quando não há nenhum dos três grupos principais', () => {
    expect(grupoPredominante([1, 0, 0, 9])).toBe(0);
    expect(grupoPredominante([0, 0, 0, 9])).toBe(3);
  });

  it("empate fica com o primeiro grupo da lista (resultado estável)", () => {
    expect(grupoPredominante([0, 2, 2, 0])).toBe(1);
  });
});

describe("calcular: continentes antigos", () => {
  const paleo: Epoca = { t: 150, pontos: [-170, -400, null, null, 1785, -501], costas: { type: "FeatureCollection", features: [] } };

  it("usa a posição antiga (em décimos de grau)", () => {
    const r = calcular(dadosDeTeste(), filtrosPadrao(), paleo);
    expect(r.features.find((p) => p.id === 0)?.geometry.coordinates).toEqual([-17, -40]);
  });

  it("local que o modelo não reconstrói sai do mapa e entra na contagem de ocultos", () => {
    const r = calcular(dadosDeTeste(), filtrosPadrao(), paleo);
    expect(r.features.map((p) => p.id)).toEqual([0, 2]);
    expect(r.semPosicao).toBe(3); // os 3 fósseis do local 1
    expect(r.totalFosseis).toBe(4);
  });
});

describe("calcular: histograma", () => {
  it("ignora o filtro de tempo (mostra a distribuição inteira, com o intervalo destacado por cima)", () => {
    const dados = dadosDeTeste();
    const todo = calcular(dados, filtrosPadrao()).histograma;
    const recorte = calcular(dados, { ...filtrosPadrao(), de: 100, ate: 80 }).histograma;
    expect([...recorte]).toEqual([...todo]);
  });
});

describe("filtros na URL", () => {
  it("um link editado à mão com valores absurdos é limitado a valores válidos", () => {
    const f = lerFiltrosDaURL("?de=999&ate=500");
    expect(f.de).toBe(252);
    expect(f.ate).toBe(250); // nunca a menos de 2 Ma da outra alça
  });

  it("intervalo invertido não gera filtro impossível", () => {
    const f = lerFiltrosDaURL("?de=100&ate=150");
    expect(f.ate).toBeLessThan(f.de);
  });

  it("código de país só aceita letras/números curtos (nada vai pra tela sem passar por aqui)", () => {
    expect(lerFiltrosDaURL('?pais="><script>').pais).toMatch(/^[A-Z0-9]{0,3}$/);
  });

  it("ida e volta preserva o estado", () => {
    const original: Filtros = {
      ...filtrosPadrao(),
      de: 201.4,
      ate: 145,
      grupos: [true, false, true, false],
      tipos: [false, true, true],
      dietas: [true, true, false, false, false],
      pais: "BR",
      continentes: "antigos",
    };
    const volta = lerFiltrosDaURL(filtrosParaURL(original));
    expect(volta).toEqual(original);
  });

  it("estado padrão gera URL vazia (link limpo pra compartilhar)", () => {
    expect(filtrosParaURL(filtrosPadrao())).toBe("");
  });

  it("os números do mapa batem com a soma dos pontos", () => {
    const r = calcular(dadosDeTeste(), filtrosPadrao());
    expect(somar(r.features.map((p) => p.properties.n))).toBe(r.totalFosseis);
  });
});

describe("limparFiltros", () => {
  it("volta tudo ao padrão, mas mantém a escolha de continentes (é visualização, não filtro)", () => {
    const sujo: Filtros = { ...filtrosPadrao(), de: 150, pais: "BR", tipos: [true, false, false], continentes: "antigos" };
    expect(limparFiltros(sujo)).toEqual({ ...filtrosPadrao(), continentes: "antigos" });
  });
});
