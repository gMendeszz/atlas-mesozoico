// Popups dos pontos: clique abre o detalhe do local; passar o mouse mostra um resumo rápido.
// Ficam fora do React (são do MapLibre); o conteúdo vem de src/popup.ts, já escapado.
import type { MapLayerMouseEvent } from "maplibre-gl";
import { maplibregl, fonte, type MapaLibre } from "./mapa";
import { htmlDoLocal, htmlDica } from "./popup";
import { fmt } from "./texto";
import type { Dados, Filtros, Ponto } from "./tipos";

export interface Popups {
  abrir: (i: number, coordenadas: [number, number]) => void;
  fechar: () => void;
  desmontar: () => void;
}

// `filtros()` devolve o estado atual (o popup mostra só os fósseis que passam neles)
export function montarPopups(map: MapaLibre, dados: Dados, filtros: () => Filtros): Popups {
  let popupAtual: maplibregl.Popup | null = null;
  const dica = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "dica" });
  const temMouse = matchMedia("(hover: hover)").matches;
  const primeiro = (e: MapLayerMouseEvent) => e.features![0] as unknown as Ponto;
  const coordenadas = (p: Ponto) => p.geometry.coordinates as [number, number];

  function abrir(i: number, lngLat: [number, number]) {
    dica.remove();
    popupAtual?.remove();
    popupAtual = new maplibregl.Popup({ offset: 10, maxWidth: "300px" })
      .setLngLat(lngLat)
      .setHTML(htmlDoLocal(dados, i, filtros()))
      .addTo(map);
  }

  const aoClicarPonto = (e: MapLayerMouseEvent) => {
    const p = primeiro(e);
    abrir(p.id, coordenadas(p));
  };
  const aoClicarCluster = async (e: MapLayerMouseEvent) => {
    const c = e.features![0];
    const zoom = await fonte(map, "dinos")?.getClusterExpansionZoom(c.properties.cluster_id);
    if (zoom === undefined) return; // mapa base trocando (tema)
    map.easeTo({ center: (c.geometry as Ponto["geometry"]).coordinates as [number, number], zoom });
  };
  // Resumo ao passar o mouse (só em aparelhos com mouse)
  const aoPassarPonto = (e: MapLayerMouseEvent) => {
    if (!temMouse) return;
    const p = primeiro(e);
    dica.setLngLat(coordenadas(p)).setHTML(htmlDica(dados, p.id, p.properties.n)).addTo(map);
  };
  const aoPassarCluster = (e: MapLayerMouseEvent) => {
    if (!temMouse) return;
    const c = primeiro(e);
    dica.setLngLat(coordenadas(c)).setHTML(`${fmt(c.properties.n)} fósseis · clique para aproximar`).addTo(map);
  };
  const aoEntrar = () => (map.getCanvas().style.cursor = "pointer");
  const aoSair = () => {
    map.getCanvas().style.cursor = "";
    dica.remove();
  };

  map.on("click", "pontos", aoClicarPonto);
  map.on("click", "clusters", aoClicarCluster);
  map.on("mousemove", "pontos", aoPassarPonto);
  map.on("mousemove", "clusters", aoPassarCluster);
  for (const camada of ["clusters", "pontos"]) {
    map.on("mouseenter", camada, aoEntrar);
    map.on("mouseleave", camada, aoSair);
  }

  return {
    abrir,
    fechar: () => popupAtual?.remove(),
    desmontar: () => {
      map.off("click", "pontos", aoClicarPonto);
      map.off("click", "clusters", aoClicarCluster);
      map.off("mousemove", "pontos", aoPassarPonto);
      map.off("mousemove", "clusters", aoPassarCluster);
      for (const camada of ["clusters", "pontos"]) {
        map.off("mouseenter", camada, aoEntrar);
        map.off("mouseleave", camada, aoSair);
      }
      dica.remove();
      popupAtual?.remove();
    },
  };
}
