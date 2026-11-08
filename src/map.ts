// The map (MapLibre): creation, base-map theme, layers and fitting bounds. It knows nothing about
// React or the page: callers pass in what it needs (see hooks/useMap.ts).
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, LayerSpecification, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { FeatureCollection } from "geojson";
import { GROUPS } from "./constants";
import { boundsOfPoints, wholeGlobeZoom } from "./geo";
import type { Point, Theme } from "./types";

// MapLibre 6: with Vite, the worker URL has to be provided (official docs)
maplibregl.setWorkerUrl(workerUrl);

export { maplibregl };
export type { MapLibreMap };
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export const source = (map: MapLibreMap, id: string) => map.getSource<GeoJSONSource>(id);
export const empty: FeatureCollection = { type: "FeatureCollection", features: [] };

// `bottomMargin`: height of the timeline, which sits over the bottom of the map
export function createMap(container: HTMLElement, theme: Theme, bottomMargin: number): MapLibreMap {
  const map = new maplibregl.Map({
    container,
    center: [-20, 10],
    zoom: wholeGlobeZoom(innerWidth, innerHeight - bottomMargin - 24),
    attributionControl: false, // added below, once the style has started loading
    // More restrained inertia than the default (maxSpeed 1400, deceleration 2500): on the globe,
    // the default inertia made a short drag spin 150°+ after releasing the mouse.
    dragPan: { linearity: 0.25, maxSpeed: 600, deceleration: 3500 },
    // Control labels (read by screen readers)
    locale: {
      "Map.Title": "Fossil map",
      "NavigationControl.ZoomIn": "Zoom in",
      "NavigationControl.ZoomOut": "Zoom out",
      "AttributionControl.ToggleAttribution": "Show or hide map credits",
      "AttributionControl.MapFeedback": "Suggest a map correction",
      "Popup.Close": "Close",
    },
  });
  // Zoom only: the compass (north up) isn't needed, the atlas doesn't rotate the map sideways
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  loadStyle(map, theme);
  // Map credits shown from the start: on its own, MapLibre only writes them once the style has
  // arrived from the server, which on a slow phone was the last thing to appear on the page.
  // When the style arrives with the same text, MapLibre doesn't repeat it; if OpenFreeMap ever
  // changes its text, theirs shows up next to this one.
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: BASE_MAP_CREDITS }));
  return map;
}

// Exactly the same HTML as the "attribution" of OpenFreeMap's tiles (tiles.openfreemap.org/planet),
// character for character (&copy; included): MapLibre compares the text, not how it looks
const BASE_MAP_CREDITS =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

// ---------- Base-map theme ----------
const STYLES: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

type Paint = Record<string, unknown>;

// OpenFreeMap's dark style is neutral black with faded names; here it gets the atlas's warm
// tones and readable names (contrast ≥ 4.5:1 against the land)
const DARK_ADJUSTMENTS: Record<string, Paint> = {
  background: { "background-color": "#2b261f" },
  water: { "fill-color": "#141b20" },
  waterway: { "line-color": "#141b20" },
  water_name: { "text-color": "#77848b", "text-halo-color": "#141b20" },
  boundary_state: { "line-color": "#3d372f" },
  "boundary_country_z0-4": { "line-color": "#4d463c" },
  "boundary_country_z5-": { "line-color": "#4d463c" },
};
const DARK_LABELS: Paint = { "text-color": "#b0a698", "text-halo-color": "rgba(0,0,0,0.75)" };

const withPaint = (layer: LayerSpecification, paint: Paint): LayerSpecification =>
  ({ ...layer, paint: { ...("paint" in layer ? layer.paint : {}), ...paint } }) as LayerSpecification;

function adjustForDark(layer: LayerSpecification): LayerSpecification {
  const adjustment = DARK_ADJUSTMENTS[layer.id] ?? (layer.id.startsWith("place_") ? DARK_LABELS : null);
  return adjustment ? withPaint(layer, adjustment) : layer;
}

// Our own layers and data sources (everything else is the base map)
const OUR_SOURCES = ["paleo", "dinos", "highlight"];
const OUR_LAYERS = new Set(["paleo-ocean", "paleo-land", "paleo-outline", "clusters", "cluster-count", "points", "highlight"]);
export const isOurLayer = (id: string): boolean => OUR_LAYERS.has(id);

// Loads the theme's base map. On a theme switch, it carries over our layers and data (with the
// new theme's colors) and, if the ancient continents are on, the new base map comes in already hidden.
export function loadStyle(map: MapLibreMap, theme: Theme): void {
  map.setStyle(STYLES[theme], {
    diff: false,
    transformStyle: (previous: StyleSpecification | undefined, next: StyleSpecification): StyleSpecification => {
      let layers = theme === "dark" ? next.layers.map(adjustForDark) : next.layers;
      if (!previous) return { ...next, layers };

      const ours = previous.layers.filter((l) => OUR_LAYERS.has(l.id));
      const paleoOn = ours.some((l) => l.id === "paleo-land" && l.layout?.visibility === "visible");
      if (paleoOn) {
        layers = layers.map((l) => ({ ...l, layout: { ...l.layout, visibility: "none" } }) as LayerSpecification);
      }

      const paint = paints(theme);
      const sources = Object.fromEntries(OUR_SOURCES.filter((id) => previous.sources[id]).map((id) => [id, previous.sources[id]]));
      return {
        ...next,
        sources: { ...next.sources, ...sources },
        layers: [...layers, ...ours.map((l) => withPaint(l, paint[l.id] ?? {}))],
      };
    },
  });
}

// Base-map names in English when the map has the translation (otherwise, the local name)
export function englishLabels(map: MapLibreMap): void {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol") continue;
    const field = map.getLayoutProperty(layer.id, "text-field");
    if (field && JSON.stringify(field).includes("name")) {
      map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:en"], ["get", "name"]]);
    }
  }
}

// Atmosphere glow around the globe; weaker in the dark theme so it doesn't glare
export function setSky(map: MapLibreMap, theme: Theme): void {
  const glow = theme === "dark" ? 0.35 : 1;
  map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, glow, 5, glow, 7, 0] });
}

// ---------- Layers ----------
const COLORS = {
  light: { group: "color", stroke: "#fff", cluster: "#3b3226", clusterText: "#fff", ocean: "#c9d9df", land: "#efe5cf", coast: "#a8987a", highlight: "#a2471f" },
  dark: { group: "darkColor", stroke: "#1d1a16", cluster: "#d8cbb5", clusterText: "#1d1a16", ocean: "#162027", land: "#342e25", coast: "#6e604c", highlight: "#f08a55" },
} as const;

// Colors of our layers in each theme (the rest of their look doesn't change)
function paints(theme: Theme): Record<string, Paint> {
  const c = COLORS[theme];
  return {
    "paleo-ocean": { "background-color": c.ocean },
    "paleo-land": { "fill-color": c.land },
    "paleo-outline": { "line-color": c.coast, "line-width": 0.8 },
    clusters: {
      "circle-color": c.cluster,
      "circle-opacity": 0.8,
      "circle-radius": ["step", ["get", "n"], 12, 50, 17, 300, 23, 1000, 30],
      "circle-stroke-width": 2,
      "circle-stroke-color": c.stroke,
    },
    "cluster-count": { "text-color": c.clusterText },
    points: {
      // Point color from the site's dominant group
      "circle-color": ["match", ["get", "g"], ...GROUPS.flatMap((g, i) => [i, g[c.group]]), "#999"],
      // Sites with more fossils are slightly bigger
      "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 5.5, 10, 8, 50, 11],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": c.stroke,
    },
    highlight: { "circle-radius": 13, "circle-color": "transparent", "circle-stroke-width": 3, "circle-stroke-color": c.highlight },
  };
}

export function addLayers(map: MapLibreMap, theme: Theme, initialFeatures: Point[]): void {
  const paint = paints(theme);
  const layer = (spec: Record<string, unknown>) => map.addLayer(spec as LayerSpecification);

  // Ancient continents: ocean + land of the time slice, below the points (hidden at first)
  map.addSource("paleo", { type: "geojson", data: empty });
  const hidden = { visibility: "none" };
  layer({ id: "paleo-ocean", type: "background", layout: hidden, paint: paint["paleo-ocean"] });
  layer({ id: "paleo-land", type: "fill", source: "paleo", layout: hidden, paint: paint["paleo-land"] });
  layer({ id: "paleo-outline", type: "line", source: "paleo", layout: hidden, paint: paint["paleo-outline"] });

  map.addSource("dinos", {
    type: "geojson",
    data: { type: "FeatureCollection", features: initialFeatures },
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: 9,
    clusterProperties: { n: ["+", ["get", "n"]] }, // total fossils in the cluster
  });

  layer({ id: "clusters", type: "circle", source: "dinos", filter: ["has", "point_count"], paint: paint.clusters });
  layer({
    id: "cluster-count",
    type: "symbol",
    source: "dinos",
    filter: ["has", "point_count"],
    layout: {
      // Number of fossils (not sites); 1000+ becomes "1.2k"
      "text-field": [
        "case",
        [">=", ["get", "n"], 1000],
        ["concat", ["number-format", ["/", ["get", "n"], 1000], { locale: "en-US", "max-fraction-digits": 1 }], "k"],
        ["to-string", ["get", "n"]],
      ],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
    },
    paint: paint["cluster-count"],
  });
  layer({ id: "points", type: "circle", source: "dinos", filter: ["!", ["has", "point_count"]], paint: paint.points });

  // Highlight of the sites found by the search (a ring around the point)
  map.addSource("highlight", { type: "geojson", data: empty });
  layer({ id: "highlight", type: "circle", source: "highlight", paint: paint.highlight });
}

// Turns the ancient-continents look on/off (the base map disappears; the time slice's land shows up)
export function showPaleo(map: MapLibreMap, baseLayers: string[], on: boolean): void {
  const vis = (v: boolean) => (v ? "visible" : "none");
  for (const id of baseLayers) map.setLayoutProperty(id, "visibility", vis(!on));
  for (const id of ["paleo-ocean", "paleo-land", "paleo-outline"]) map.setLayoutProperty(id, "visibility", vis(on));
}

// Fits the map to a set of points (the chosen country, search results).
// `panel`: the side panel, which covers part of the map (on the left or, on phones, at the top).
export function fitToPoints(map: MapLibreMap, features: Point[], panel: HTMLElement | null): void {
  const bounds = boundsOfPoints(features.map((f) => f.geometry.coordinates as [number, number]));
  if (!bounds) return;
  const wide = innerWidth > 600;
  const panelHeight = panel?.offsetHeight ?? 0;
  const panelWidth = panel?.offsetWidth ?? 0;
  // The timeline is already accounted for by the map's fixed padding (setPadding), which fitBounds adds to these
  map.fitBounds(bounds, {
    padding: { top: wide ? 60 : panelHeight + 30, bottom: 30, right: 60, left: wide ? panelWidth + 40 : 40 },
    maxZoom: 6,
    duration: reducedMotion.matches ? 0 : 1200,
  });
}
