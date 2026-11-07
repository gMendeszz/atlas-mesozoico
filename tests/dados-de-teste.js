// Dados pequenos, no mesmo formato de public/data/dinos.json, montados pra cobrir os casos
// difíceis: faixa de idade que cruza o fim do Mesozoico, local na linha de data, identificação
// incerta, nome malicioso, empate entre grupos, pegada, ovo e formação incerta.
import { prepararDados } from "../src/dados.js";

export const NOMES = ["", "Tyrannosaurus rex", "Tyrannosauridae", "Dinosauria", "Foo bar", '<img src=x onerror="alert(1)">'];

export function dadosDeTeste() {
  return prepararDados({
    meta: {
      gerado_em: "2026-11-04",
      assinatura_locais: "teste",
      grupos: ["theropoda", "sauropodomorpha", "ornithischia", "outros"],
      tipos: ["corpo", "pegada", "ovo"],
      dietas: ["carnivoro", "herbivoro", "onivoro", "piscivoro", "desconhecida"],
    },
    dic: {
      nome: NOMES,
      nome_original: ["", "cf. Tyrannosaurus rex"],
      familia: ["", "Tyrannosauridae"],
      intervalo: ["", "Carnian – Norian", "Maastrichtian – Danian", "Kimmeridgian"],
      pais: ["", "BR", "US", "NZ"],
      estado: ["", "Rio Grande do Sul", "Montana", "Chatham Islands"],
      formacao: ["", "Santa Maria", "Hell Creek (?)"],
      autor: ["", "Fulano, 1900", "Osborn, 1905"],
    },
    locais: {
      col: [100, 200, 300],
      lng: [-53.7, -106.5, -176.7],
      lat: [-29.7, 47.0, -43.8],
      max: [230, 72.2, 150],
      min: [220, 61.66, 140],
      intervalo: [1, 2, 3],
      pais: [1, 2, 3],
      estado: [1, 2, 3],
      formacao: [1, 2, 0],
      n: [3, 3, 1],
    },
    // local 0 (Brasil, Triássico, Fm. Santa Maria): 1 terópode carnívoro (incerto, com autor que
    //   não deve aparecer) + 1 pegada e 1 ovo de "outros", sem dieta
    // local 1 (EUA, 72–61,7 Ma, Fm. Hell Creek incerta): 1 sauropodomorfo herbívoro (com autor) +
    //   1 ornitísquio herbívoro + 1 terópode carnívoro com nome malicioso
    // local 2 (Nova Zelândia, Jurássico, sem formação): 1 "outros" sem dieta
    fosseis: {
      nome: [1, 3, 3, 4, 4, 5, 3],
      familia: [1, 0, 0, 0, 0, 0, 0],
      grupo: [0, 3, 3, 1, 2, 0, 3],
      tipo: [0, 1, 2, 0, 0, 0, 0],
      dieta: [0, 4, 4, 1, 1, 0, 4],
      autor: [2, 0, 0, 1, 0, 0, 0],
    },
    incertos: { j: [0], nome: [1] },
  });
}
