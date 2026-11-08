// O mapa (MapLibre): criação, tema do mapa base, camadas e enquadramento. Não conhece React nem
// a página: quem chama passa o que precisa (ver hooks/useMapa.ts).
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, LayerSpecification, Map as MapaLibre, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { FeatureCollection } from "geojson";
import { GRUPOS } from "./constantes";
import { limitesDosPontos, zoomDoGloboInteiro } from "./geo";
import type { Ponto, Tema } from "./tipos";

// MapLibre 6: com Vite, o endereço do worker precisa ser informado (doc oficial)
maplibregl.setWorkerUrl(workerUrl);

export { maplibregl };
export type { MapaLibre };
export const reduzirMovimento = matchMedia("(prefers-reduced-motion: reduce)");

export const fonte = (map: MapaLibre, id: string) => map.getSource<GeoJSONSource>(id);
export const vazio: FeatureCollection = { type: "FeatureCollection", features: [] };

// `margemInferior`: altura da linha do tempo, que fica por cima da parte de baixo do mapa
export function criarMapa(container: HTMLElement, tema: Tema, margemInferior: number): MapaLibre {
  const map = new maplibregl.Map({
    container,
    center: [-20, 10],
    zoom: zoomDoGloboInteiro(innerWidth, innerHeight - margemInferior - 24),
    attributionControl: { compact: true },
    // Inércia mais contida que o padrão (maxSpeed 1400, deceleration 2500): no globo, a
    // inércia padrão fazia um arrasto curto girar 150°+ depois de soltar o mouse.
    dragPan: { linearity: 0.25, maxSpeed: 600, deceleration: 3500 },
    // Textos dos controles (lidos por leitores de tela) em português
    locale: {
      "Map.Title": "Mapa de fósseis",
      "NavigationControl.ZoomIn": "Aproximar",
      "NavigationControl.ZoomOut": "Afastar",
      "NavigationControl.ResetBearing": "Arraste para girar; clique para pôr o norte para cima",
      "AttributionControl.ToggleAttribution": "Mostrar ou esconder créditos do mapa",
      "AttributionControl.MapFeedback": "Enviar correção do mapa",
      "Popup.Close": "Fechar",
    },
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  carregarEstilo(map, tema);
  return map;
}

// ---------- Tema do mapa base ----------
const ESTILOS: Record<Tema, string> = {
  claro: "https://tiles.openfreemap.org/styles/positron",
  escuro: "https://tiles.openfreemap.org/styles/dark",
};

type Pintura = Record<string, unknown>;

// O estilo escuro do OpenFreeMap é preto neutro e com nomes apagados; aqui ele ganha os tons
// quentes do atlas e nomes legíveis (contraste ≥ 4,5:1 com a terra)
const AJUSTES_ESCURO: Record<string, Pintura> = {
  background: { "background-color": "#2b261f" },
  water: { "fill-color": "#141b20" },
  waterway: { "line-color": "#141b20" },
  water_name: { "text-color": "#77848b", "text-halo-color": "#141b20" },
  boundary_state: { "line-color": "#3d372f" },
  "boundary_country_z0-4": { "line-color": "#4d463c" },
  "boundary_country_z5-": { "line-color": "#4d463c" },
};
const NOMES_ESCURO: Pintura = { "text-color": "#b0a698", "text-halo-color": "rgba(0,0,0,0.75)" };

const comPintura = (camada: LayerSpecification, pintura: Pintura): LayerSpecification =>
  ({ ...camada, paint: { ...("paint" in camada ? camada.paint : {}), ...pintura } }) as LayerSpecification;

function ajustarParaEscuro(camada: LayerSpecification): LayerSpecification {
  const ajuste = AJUSTES_ESCURO[camada.id] ?? (camada.id.startsWith("place_") ? NOMES_ESCURO : null);
  return ajuste ? comPintura(camada, ajuste) : camada;
}

// Camadas e fontes de dados nossas (o resto é o mapa base)
const NOSSAS_FONTES = ["paleo", "dinos", "destaque"];
const NOSSAS_CAMADAS = new Set(["paleo-oceano", "paleo-terra", "paleo-contorno", "clusters", "clusters-numero", "pontos", "destaque"]);
export const ehCamadaNossa = (id: string): boolean => NOSSAS_CAMADAS.has(id);

// Carrega o mapa base do tema. Numa troca de tema, leva junto as nossas camadas e dados (com as
// cores do novo tema) e, se os continentes antigos estiverem ligados, o mapa base novo já vem escondido.
export function carregarEstilo(map: MapaLibre, tema: Tema): void {
  map.setStyle(ESTILOS[tema], {
    diff: false,
    transformStyle: (anterior: StyleSpecification | undefined, novo: StyleSpecification): StyleSpecification => {
      let camadas = tema === "escuro" ? novo.layers.map(ajustarParaEscuro) : novo.layers;
      if (!anterior) return { ...novo, layers: camadas };

      const nossas = anterior.layers.filter((l) => NOSSAS_CAMADAS.has(l.id));
      const paleoLigado = nossas.some((l) => l.id === "paleo-terra" && l.layout?.visibility === "visible");
      if (paleoLigado) {
        camadas = camadas.map((l) => ({ ...l, layout: { ...l.layout, visibility: "none" } }) as LayerSpecification);
      }

      const pintura = pinturas(tema);
      const fontes = Object.fromEntries(NOSSAS_FONTES.filter((id) => anterior.sources[id]).map((id) => [id, anterior.sources[id]]));
      return {
        ...novo,
        sources: { ...novo.sources, ...fontes },
        layers: [...camadas, ...nossas.map((l) => comPintura(l, pintura[l.id] ?? {}))],
      };
    },
  });
}

// Nomes do mapa base em português quando o mapa tiver a tradução (senão, o nome local)
export function nomesEmPortugues(map: MapaLibre): void {
  for (const camada of map.getStyle().layers) {
    if (camada.type !== "symbol") continue;
    const campo = map.getLayoutProperty(camada.id, "text-field");
    if (campo && JSON.stringify(campo).includes("name")) {
      map.setLayoutProperty(camada.id, "text-field", ["coalesce", ["get", "name:pt"], ["get", "name"]]);
    }
  }
}

// Brilho da atmosfera em volta do globo; no escuro, mais fraco pra não ofuscar
export function definirCeu(map: MapaLibre, tema: Tema): void {
  const brilho = tema === "escuro" ? 0.35 : 1;
  map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, brilho, 5, brilho, 7, 0] });
}

// ---------- Camadas ----------
const CORES = {
  claro: { grupo: "cor", contorno: "#fff", cluster: "#3b3226", clusterTexto: "#fff", oceano: "#c9d9df", terra: "#efe5cf", costa: "#a8987a", destaque: "#a2471f" },
  escuro: { grupo: "corEscura", contorno: "#1d1a16", cluster: "#d8cbb5", clusterTexto: "#1d1a16", oceano: "#162027", terra: "#342e25", costa: "#6e604c", destaque: "#f08a55" },
} as const;

// Cores das nossas camadas em cada tema (o resto do visual delas não muda)
function pinturas(tema: Tema): Record<string, Pintura> {
  const c = CORES[tema];
  return {
    "paleo-oceano": { "background-color": c.oceano },
    "paleo-terra": { "fill-color": c.terra },
    "paleo-contorno": { "line-color": c.costa, "line-width": 0.8 },
    clusters: {
      "circle-color": c.cluster,
      "circle-opacity": 0.8,
      "circle-radius": ["step", ["get", "n"], 12, 50, 17, 300, 23, 1000, 30],
      "circle-stroke-width": 2,
      "circle-stroke-color": c.contorno,
    },
    "clusters-numero": { "text-color": c.clusterTexto },
    pontos: {
      // Cor do ponto pelo grupo predominante no local
      "circle-color": ["match", ["get", "g"], ...GRUPOS.flatMap((g, i) => [i, g[c.grupo]]), "#999"],
      // Locais com mais fósseis ficam um pouco maiores
      "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 5.5, 10, 8, 50, 11],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": c.contorno,
    },
    destaque: { "circle-radius": 13, "circle-color": "transparent", "circle-stroke-width": 3, "circle-stroke-color": c.destaque },
  };
}

export function adicionarCamadas(map: MapaLibre, tema: Tema, featuresIniciais: Ponto[]): void {
  const pintura = pinturas(tema);
  const camada = (spec: Record<string, unknown>) => map.addLayer(spec as LayerSpecification);

  // Continentes antigos: oceano + terras da época, por baixo dos pontos (começam escondidos)
  map.addSource("paleo", { type: "geojson", data: vazio });
  const escondida = { visibility: "none" };
  camada({ id: "paleo-oceano", type: "background", layout: escondida, paint: pintura["paleo-oceano"] });
  camada({ id: "paleo-terra", type: "fill", source: "paleo", layout: escondida, paint: pintura["paleo-terra"] });
  camada({ id: "paleo-contorno", type: "line", source: "paleo", layout: escondida, paint: pintura["paleo-contorno"] });

  map.addSource("dinos", {
    type: "geojson",
    data: { type: "FeatureCollection", features: featuresIniciais },
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: 9,
    clusterProperties: { n: ["+", ["get", "n"]] }, // soma de fósseis no cluster
  });

  camada({ id: "clusters", type: "circle", source: "dinos", filter: ["has", "point_count"], paint: pintura.clusters });
  camada({
    id: "clusters-numero",
    type: "symbol",
    source: "dinos",
    filter: ["has", "point_count"],
    layout: {
      // Número de fósseis (não de locais); 1000+ vira "1,2 mil"
      "text-field": [
        "case",
        [">=", ["get", "n"], 1000],
        ["concat", ["number-format", ["/", ["get", "n"], 1000], { locale: "pt-BR", "max-fraction-digits": 1 }], " mil"],
        ["to-string", ["get", "n"]],
      ],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
    },
    paint: pintura["clusters-numero"],
  });
  camada({ id: "pontos", type: "circle", source: "dinos", filter: ["!", ["has", "point_count"]], paint: pintura.pontos });

  // Destaque dos locais encontrados pela busca (anel em volta do ponto)
  map.addSource("destaque", { type: "geojson", data: vazio });
  camada({ id: "destaque", type: "circle", source: "destaque", paint: pintura.destaque });
}

// Liga/desliga o visual de continentes antigos (o mapa base some; aparecem as terras da época)
export function mostrarPaleo(map: MapaLibre, camadasBase: string[], ligado: boolean): void {
  const vis = (on: boolean) => (on ? "visible" : "none");
  for (const id of camadasBase) map.setLayoutProperty(id, "visibility", vis(!ligado));
  for (const id of ["paleo-oceano", "paleo-terra", "paleo-contorno"]) map.setLayoutProperty(id, "visibility", vis(ligado));
}

// Enquadra o mapa num conjunto de pontos (país escolhido, resultado da busca).
// `painel`: o painel lateral, que cobre parte do mapa (à esquerda ou, no celular, no topo).
export function enquadrar(map: MapaLibre, features: Ponto[], painel: HTMLElement | null): void {
  const limites = limitesDosPontos(features.map((f) => f.geometry.coordinates as [number, number]));
  if (!limites) return;
  const largo = innerWidth > 600;
  const alturaPainel = painel?.offsetHeight ?? 0;
  const larguraPainel = painel?.offsetWidth ?? 0;
  // A linha do tempo já é descontada pela margem fixa do mapa (setPadding), que o fitBounds soma a estas
  map.fitBounds(limites, {
    padding: { top: largo ? 60 : alturaPainel + 30, bottom: 30, right: 60, left: largo ? larguraPainel + 40 : 40 },
    maxZoom: 6,
    duration: reduzirMovimento.matches ? 0 : 1200,
  });
}
