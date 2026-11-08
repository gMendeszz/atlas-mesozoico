// Desenho do histograma da linha do tempo (caminho SVG num quadro de 186 × 40).
import { MA_SPAN } from "./constantes";

// Escala de raiz quadrada: sem ela, o pico do fim do Cretáceo achata tudo e o Triássico
// (poucos fósseis) some. Cada milhão de anos vira um degrau de largura 1.
export function caminhoHistograma(histograma: ArrayLike<number>): string {
  const valores = Array.from(histograma);
  const max = Math.max(...valores);
  let d = "M0,40";
  if (max > 0) {
    valores.forEach((v, b) => {
      const y = (40 - 38 * Math.sqrt(v / max)).toFixed(1);
      d += `L${b},${y}L${b + 1},${y}`;
    });
  }
  return `${d}L${MA_SPAN},40Z`;
}
