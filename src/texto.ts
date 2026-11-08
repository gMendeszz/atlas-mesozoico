// Formatação de textos e números, e escape de HTML.

// Number() garante que só número vira texto aqui (nunca uma string vinda dos dados)
export const fmt = (n: number): string => Number(n).toLocaleString("pt-BR");

// Milhões de anos com no máximo 1 casa decimal: 201.4 -> "201,4"; 145 -> "145"
export const fmtMa = (ma: number): string => (Math.round(ma * 10) / 10).toLocaleString("pt-BR");

// "1 fóssil" / "2.345 fósseis"
export const nFosseis = (n: number): string => (n === 1 ? "1 fóssil" : `${fmt(n)} fósseis`);

// Escapa texto antes de pôr dentro de HTML (nomes vêm de fora: nunca confiar).
// O React já escapa sozinho; isto é pros popups do mapa, que recebem HTML pronto.
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Códigos próprios do PBDB pra achados no mar (ex.: poços de petróleo); não são ISO
export const OCEANOS_PBDB: Record<string, string> = {
  O1: "Oceano Ártico",
  O2: "Atlântico Norte",
  O3: "Atlântico Sul",
  O4: "Pacífico Norte",
  O5: "Pacífico Sul",
  O6: "Oceano Índico",
  O7: "Oceano Austral",
};

const nomePaisIntl = new Intl.DisplayNames(["pt-BR"], { type: "region" });

// Nome do país em português a partir do código do PBDB (ISO, com exceções)
export function nomePais(cc: string): string {
  if (!cc) return "";
  if (OCEANOS_PBDB[cc]) return OCEANOS_PBDB[cc];
  try {
    return nomePaisIntl.of(cc) ?? cc;
  } catch {
    return cc; // código desconhecido: mostra o próprio código em vez de quebrar
  }
}
