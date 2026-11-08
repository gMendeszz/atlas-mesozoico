// Formatação de textos e números, e escape de HTML. O site é em inglês (números como 22,118).

export const IDIOMA = "en-US";

// Number() garante que só número vira texto aqui (nunca uma string vinda dos dados)
export const fmt = (n: number): string => Number(n).toLocaleString(IDIOMA);

// Milhões de anos com no máximo 1 casa decimal: 201.4 -> "201.4"; 145 -> "145"
export const fmtMa = (ma: number): string => (Math.round(ma * 10) / 10).toLocaleString(IDIOMA);

// "1 fossil" / "2,345 fossils"
export const nFosseis = (n: number): string => (n === 1 ? "1 fossil" : `${fmt(n)} fossils`);

// Escapa texto antes de pôr dentro de HTML (nomes vêm de fora: nunca confiar).
// O React já escapa sozinho; isto é pros popups do mapa, que recebem HTML pronto.
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Códigos próprios do PBDB pra achados no mar (ex.: poços de petróleo); não são ISO
export const OCEANOS_PBDB: Record<string, string> = {
  O1: "Arctic Ocean",
  O2: "North Atlantic",
  O3: "South Atlantic",
  O4: "North Pacific",
  O5: "South Pacific",
  O6: "Indian Ocean",
  O7: "Southern Ocean",
};

const nomePaisIntl = new Intl.DisplayNames([IDIOMA], { type: "region" });

// Nome do país (em inglês) a partir do código do PBDB (ISO, com exceções)
export function nomePais(cc: string): string {
  if (!cc) return "";
  if (OCEANOS_PBDB[cc]) return OCEANOS_PBDB[cc];
  try {
    return nomePaisIntl.of(cc) ?? cc;
  } catch {
    return cc; // código desconhecido: mostra o próprio código em vez de quebrar
  }
}
