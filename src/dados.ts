// Preparação dos dados de public/data/dinos.json (formato colunar: ver scripts/baixar_dados.py).
import { periodoDoMeio } from "./constantes";
import { IDIOMA, nomePais } from "./texto";
import type { Dados, DadosBrutos } from "./tipos";

export function prepararDados(d: DadosBrutos): Dados {
  const L = d.locais;
  const total = L.col.length;
  const inicio = new Uint32Array(total + 1);
  const periodo = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    inicio[i + 1] = inicio[i] + L.n[i];
    periodo[i] = periodoDoMeio((L.max[i] + L.min[i]) / 2);
  }

  // Países em ordem alfabética; índice 0 do dicionário = sem país (vai pro fim)
  const paises = d.dic.pais
    .map((cc, idx) => ({ idx, cc, nome: cc ? nomePais(cc) : "No country given" }))
    .sort((a, b) => (a.cc ? 0 : 1) - (b.cc ? 0 : 1) || a.nome.localeCompare(b.nome, IDIOMA));

  const incertos = d.incertos ?? { j: [], nome: [] };
  const incertoDe = new Map(incertos.j.map((j, k) => [j, incertos.nome[k]]));

  return { ...d, inicio, periodo, paises, incertoDe };
}

// "Estado, País" de um local (nome atual do lugar)
export function lugarDoLocal(dados: Dados, i: number): string {
  const { dic, locais: L } = dados;
  return [dic.estado[L.estado[i]], nomePais(dic.pais[L.pais[i]])].filter(Boolean).join(", ");
}

// Baixa os dados uma vez só (a promessa fica guardada: o React pode montar o app duas vezes
// em desenvolvimento, e a página não deve baixar o arquivo de novo por isso).
// "no-cache" = sempre confere com o servidor se há versão nova (resposta 304 se não houver)
let promessaDados: Promise<Dados> | null = null;
export function carregarDados(): Promise<Dados> {
  promessaDados ??= fetch("data/dinos.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<DadosBrutos>;
    })
    .then(prepararDados);
  return promessaDados;
}
