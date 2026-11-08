// Creates the MapLibre map inside a React element and tracks its style (base map).
// The map is imperative; components react to `styleVersion`, which changes on every style
// load (on open and on each theme switch), to put data back on the new map.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { loadStyle, createMap, setSky, isOurLayer, englishLabels, type MapLibreMap } from "../map";
import type { Theme } from "../types";

interface Options {
  container: RefObject<HTMLDivElement | null>;
  timeline: RefObject<HTMLElement | null>; // sits over the bottom of the map
  theme: Theme;
  enabled: boolean; // false without WebGL 2: doesn't create the map
  onError: (message: string) => void;
}

export interface MapState {
  map: MapLibreMap | null;
  styleVersion: number; // 0 = loading the first style
  styleReady: () => boolean; // false while a new base map loads (theme switch)
  baseLayers: () => string[]; // base-map layers (roads, names...), hidden in ancient-continents mode
}

export function useMap({ container, timeline, theme, enabled, onError }: Options): MapState {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);
  const loadedTheme = useRef(theme);
  const loading = useRef(true);
  const baseLayers = useRef<string[]>([]);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!enabled || !container.current || !timeline.current) return;
    const timelineEl = timeline.current;
    const bottomMargin = () => timelineEl.offsetHeight + 40;
    loading.current = true;
    const m = createMap(container.current, loadedTheme.current, bottomMargin());

    // If the first style fails to load (service down, no internet), show a message.
    // Errors after that (a failed tile) are normal and MapLibre retries on its own.
    let styleOk = false;
    m.on("style.load", () => {
      styleOk = true;
      loading.current = false;
      baseLayers.current = m.getStyle().layers.map((l) => l.id).filter((id) => !isOurLayer(id));
      englishLabels(m);
      setSky(m, loadedTheme.current);
      setStyleVersion((v) => v + 1);
    });
    m.on("error", (e) => {
      if (!styleOk) onErrorRef.current("Couldn’t load the base map. Check your connection and reload the page.");
      console.error(e.error ?? e);
    });

    // The map "subtracts" the timeline: the globe and fitted bounds center on the free area
    const observer = new ResizeObserver(() => m.setPadding({ top: 0, right: 0, left: 0, bottom: bottomMargin() }));
    observer.observe(timelineEl);

    setMap(m);
    return () => {
      observer.disconnect();
      m.remove();
      setMap(null);
      setStyleVersion(0);
    };
  }, [enabled, container, timeline]);

  // Switching the theme switches the base map; points, search and ancient continents come along (see loadStyle)
  useEffect(() => {
    if (!map || theme === loadedTheme.current) return;
    loadedTheme.current = theme;
    loading.current = true;
    loadStyle(map, theme);
  }, [map, theme]);

  return {
    map,
    styleVersion,
    styleReady: useCallback(() => !loading.current, []),
    baseLayers: useCallback(() => baseLayers.current, []),
  };
}
