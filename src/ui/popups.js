// Popups dos pontos: clique abre o detalhe do local; passar o mouse mostra um resumo rápido.
import { maplibregl } from "../mapa.js";
import { htmlDoLocal, htmlDica } from "../popup.js";
import { fmt } from "../texto.js";

// `f` é o estado dos filtros (o popup mostra só os fósseis que passam neles)
export function montarPopups(map, dados, f) {
  let popupAtual = null;
  const dica = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "dica" });
  const temMouse = matchMedia("(hover: hover)").matches;

  function abrir(i, coordenadas) {
    dica.remove();
    popupAtual?.remove();
    popupAtual = new maplibregl.Popup({ offset: 10, maxWidth: "300px" })
      .setLngLat(coordenadas)
      .setHTML(htmlDoLocal(dados, i, f))
      .addTo(map);
  }

  map.on("click", "pontos", (e) => abrir(e.features[0].id, e.features[0].geometry.coordinates));
  map.on("click", "clusters", async (e) => {
    const c = e.features[0];
    const zoom = await map.getSource("dinos").getClusterExpansionZoom(c.properties.cluster_id);
    map.easeTo({ center: c.geometry.coordinates, zoom });
  });

  // Resumo ao passar o mouse (só em aparelhos com mouse)
  map.on("mousemove", "pontos", (e) => {
    if (!temMouse) return;
    const p = e.features[0];
    dica.setLngLat(p.geometry.coordinates).setHTML(htmlDica(dados, p.id, p.properties.n)).addTo(map);
  });
  map.on("mousemove", "clusters", (e) => {
    if (!temMouse) return;
    const c = e.features[0];
    dica.setLngLat(c.geometry.coordinates).setHTML(`${fmt(c.properties.n)} fósseis · clique para aproximar`).addTo(map);
  });
  for (const camada of ["clusters", "pontos"]) {
    map.on("mouseenter", camada, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", camada, () => {
      map.getCanvas().style.cursor = "";
      dica.remove();
    });
  }

  return { abrir, fechar: () => popupAtual?.remove() };
}
