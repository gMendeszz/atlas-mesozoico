// Continentes antigos: escolha da época, carregamento e decodificação dos arquivos
// public/data/paleo/<época>.json (ver scripts/baixar_paleo.py).
import { PALEO_PRIMEIRA, PALEO_ULTIMA } from "./constantes.js";

// A época mostrada é o meio do intervalo da linha do tempo, arredondado pra dezena
export const epocaDoIntervalo = (de, ate) =>
  Math.min(PALEO_ULTIMA, Math.max(PALEO_PRIMEIRA, Math.round((de + ate) / 20) * 10));

// Contornos vêm em décimos de grau, com o 1º ponto absoluto e os outros como diferença
// pro anterior. Devolve GeoJSON com cada contorno como polígono fechado.
export function decodificarCostas(costas) {
  const features = costas.map((r) => {
    let x = r[0];
    let y = r[1];
    const anel = [[x / 10, y / 10]];
    for (let k = 2; k < r.length; k += 2) {
      x += r[k];
      y += r[k + 1];
      anel.push([x / 10, y / 10]);
    }
    const [x0, y0] = anel[0];
    const [xn, yn] = anel[anel.length - 1];
    if (x0 !== xn || y0 !== yn) anel.push([x0, y0]);
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [anel] } };
  });
  return { type: "FeatureCollection", features };
}

const epocasCarregadas = new Map(); // época -> Promise com os dados prontos

// Baixa uma época (uma vez só). `assinatura` vem de dinos.json: a época só é aceita se foi
// gerada a partir exatamente da mesma lista de locais (senão os pontos ficariam trocados).
export function carregarEpoca(t, assinatura) {
  if (!epocasCarregadas.has(t)) {
    // ?v=assinatura: cada versão dos dados tem sua própria URL, então o cache do navegador
    // nunca mistura uma época antiga com um dinos.json novo
    const promessa = fetch(`data/paleo/${t}.json?v=${encodeURIComponent(assinatura)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.assinatura !== assinatura) throw new Error("época gerada de outra lista de locais");
        return { t: d.t, pontos: d.pontos, costas: decodificarCostas(d.costas) };
      })
      .catch((erro) => {
        epocasCarregadas.delete(t); // deixa tentar de novo depois
        throw erro;
      });
    epocasCarregadas.set(t, promessa);
  }
  return epocasCarregadas.get(t);
}
