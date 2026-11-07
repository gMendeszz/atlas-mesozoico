// Cálculos geográficos usados pelo mapa.

// Limites [[oeste, sul], [leste, norte]] de uma lista de coordenadas [lng, lat].
// Se os pontos atravessam a linha de data (ex.: Nova Zelândia com as Ilhas Chatham a -176°),
// a caixa "direta" iria de -176° a +178° e cobriria o mundo inteiro; nesse caso as longitudes
// negativas viram >180° (o mesmo lugar, do lado contínuo), e a caixa fica do tamanho certo.
export function limitesDosPontos(coordenadas) {
  if (!coordenadas.length) return null;
  const lngs = coordenadas.map(([lng]) => lng);
  const cruza = Math.max(...lngs) - Math.min(...lngs) > 180;
  let [oeste, sul, leste, norte] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lng0, lat] of coordenadas) {
    const lng = cruza && lng0 < 0 ? lng0 + 360 : lng0;
    oeste = Math.min(oeste, lng);
    leste = Math.max(leste, lng);
    sul = Math.min(sul, lat);
    norte = Math.max(norte, lat);
  }
  return [
    [oeste, sul],
    [leste, norte],
  ];
}

// Zoom em que o globo ocupa quase toda a área livre (largura × altura em px).
// Globo pequeno = cada pixel arrastado gira muitos graus e é fácil errar o alvo.
// Diâmetro do globo em px ≈ 512 · 2^zoom / π.
export function zoomDoGloboInteiro(largura, altura) {
  const diametro = Math.max(220, Math.min(largura * 0.92, altura * 0.94));
  return Math.log2((diametro * Math.PI) / 512);
}
