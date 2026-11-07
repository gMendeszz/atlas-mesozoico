// Preparação dos dados de public/data/dinos.json (formato colunar: ver scripts/baixar_dados.py).
import { periodoDoMeio } from "./constantes.js";
import { nomePais } from "./texto.js";

export function prepararDados(d) {
  const L = d.locais;
  const total = L.col.length;
  const inicio = new Uint32Array(total + 1); // fósseis do local i: inicio[i] até inicio[i+1]
  const periodo = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    inicio[i + 1] = inicio[i] + L.n[i];
    periodo[i] = periodoDoMeio((L.max[i] + L.min[i]) / 2);
  }

  // Países em ordem alfabética (pt-BR); índice 0 do dicionário = sem país (vai pro fim)
  const paises = d.dic.pais
    .map((cc, idx) => ({ idx, cc, nome: cc ? nomePais(cc) : "Sem país informado" }))
    .sort((a, b) => (a.cc ? 0 : 1) - (b.cc ? 0 : 1) || a.nome.localeCompare(b.nome, "pt-BR"));

  // Fóssil (posição j) -> índice do texto original em dic.nome_original, quando incerto
  const incertoDe = new Map((d.incertos?.j ?? []).map((j, k) => [j, d.incertos.nome[k]]));

  return { ...d, inicio, periodo, paises, incertoDe };
}

// "Estado, País" de um local (nome atual do lugar)
export function lugarDoLocal(dados, i) {
  const { dic, locais: L } = dados;
  return [dic.estado[L.estado[i]], nomePais(dic.pais[L.pais[i]])].filter(Boolean).join(", ");
}
