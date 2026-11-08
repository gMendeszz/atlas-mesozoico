import { describe, it, expect } from "vitest";
import { htmlDoLocal, htmlDica } from "../src/popup";
import { filtrosPadrao } from "../src/filtros";
import { nomePais, esc, fmt } from "../src/texto";
import { dadosDeTeste } from "./dados-de-teste";

describe("segurança: texto dos dados nunca vira HTML", () => {
  it("nome malicioso aparece como texto, sem criar elemento", () => {
    const html = htmlDoLocal(dadosDeTeste(), 1, filtrosPadrao());
    expect(html).not.toContain("<img");
    expect(html).toContain("&#60;img");
  });

  it("aspas são escapadas (protege atributos como title=\"...\")", () => {
    expect(esc(`" onmouseover="x`)).not.toContain('"');
  });

  it("números formatados não deixam passar texto", () => {
    // @ts-expect-error: de propósito, um texto onde deveria vir número
    expect(fmt("<b>1</b>")).not.toContain("<");
  });

  it("formação e autor vindos dos dados também são escapados", () => {
    const dados = dadosDeTeste();
    dados.dic.formacao[1] = "<script>x</script>";
    dados.dic.autor[1] = "<b>y</b>";
    expect(htmlDoLocal(dados, 0, filtrosPadrao())).not.toContain("<script>");
    expect(htmlDoLocal(dados, 1, filtrosPadrao())).not.toContain("<b>");
  });

  it("o resumo ao passar o mouse também escapa", () => {
    const dados = dadosDeTeste();
    dados.dic.estado[2] = "<script>alert(1)</script>";
    expect(htmlDica(dados, 1, 3)).not.toContain("<script>");
  });
});

describe("veracidade: o popup não mostra mais certeza do que a fonte", () => {
  it("identificação incerta mostra o texto original e a marca", () => {
    const html = htmlDoLocal(dadosDeTeste(), 0, filtrosPadrao());
    expect(html).toContain("cf. Tyrannosaurus rex");
    expect(html).toContain("uncertain identification");
  });

  it("identificação certa não leva a marca", () => {
    const html = htmlDoLocal(dadosDeTeste(), 2, filtrosPadrao());
    expect(html).not.toContain("uncertain identification");
  });

  it("com filtro de grupo, lista só os visíveis e avisa quantos foram escondidos", () => {
    const f = { ...filtrosPadrao(), grupos: [false, true, false, false] };
    const html = htmlDoLocal(dadosDeTeste(), 1, f);
    expect(html).toContain("1 fossil");
    expect(html).toContain("+2 hidden by filters");
  });

  it("com filtro de tipo, a lista também respeita (só a pegada)", () => {
    const f = { ...filtrosPadrao(), tipos: [false, true, false] };
    const html = htmlDoLocal(dadosDeTeste(), 0, f);
    expect(html).toContain("1 fossil");
    expect(html).toContain(">footprint<");
    expect(html).not.toContain(">egg<");
  });

  it("autor e ano aparecem, exceto em identificação incerta (seria certeza demais)", () => {
    expect(htmlDoLocal(dadosDeTeste(), 1, filtrosPadrao())).toContain("Fulano, 1900");
    expect(htmlDoLocal(dadosDeTeste(), 0, filtrosPadrao())).not.toContain("Osborn");
  });

  it("mostra a formação geológica, quando há", () => {
    expect(htmlDoLocal(dadosDeTeste(), 0, filtrosPadrao())).toContain("Santa Maria Formation");
    expect(htmlDoLocal(dadosDeTeste(), 2, filtrosPadrao())).not.toContain("Formation");
  });

  it('em continentes antigos, o nome do lugar é marcado como "Today:" (o lugar atual)', () => {
    expect(htmlDoLocal(dadosDeTeste(), 0, { ...filtrosPadrao(), continentes: "antigos" })).toContain("Today: Rio Grande do Sul");
    expect(htmlDoLocal(dadosDeTeste(), 0, filtrosPadrao())).not.toContain("Today:");
  });
});

describe("nomePais", () => {
  it("traduz os códigos de oceano próprios do PBDB (não são ISO)", () => {
    expect(nomePais("O2")).toBe("North Atlantic");
  });

  it('aceita o "UK" que o PBDB usa no lugar do ISO "GB"', () => {
    expect(nomePais("UK")).toBe("United Kingdom");
  });

  it("código desconhecido não derruba a página", () => {
    expect(() => nomePais("O9")).not.toThrow();
  });
});
