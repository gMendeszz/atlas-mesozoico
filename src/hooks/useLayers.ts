// Keeps the map layers in sync with React state: points, ancient continents, search highlight
// and popups. Each effect re-runs on every style load (`styleVersion`), so a theme switch in the
// middle of a change doesn't leave the new map out of date.
import { useEffect, useRef, useState } from "react";
import { addLayers, source, showPaleo, type MapLibreMap } from "../map";
import { mountPopups, type Popups } from "../map-popups";
import type { Data, TimeSlice, Filters, Point, Result, Theme } from "../types";
import type { MapState } from "./useMap";

interface Options {
  mapState: MapState;
  theme: Theme;
  data: Data | null;
  result: Result | null;
  timeSlice: TimeSlice | null; // ancient continents on (and the time slice has arrived)
  highlight: Point[]; // sites found by the search
  filters: Filters; // the popup only shows fossils that pass them
}

export function useLayers({ mapState, theme, data, result, timeSlice, highlight, filters }: Options) {
  const { map, styleVersion, styleReady, baseLayers } = mapState;

  // The layers are added once per map, when the style and the data are ready
  const [mapWithLayers, setMapWithLayers] = useState<MapLibreMap | null>(null);
  const ready = map !== null && mapWithLayers === map;
  useEffect(() => {
    if (!map || !result || !styleVersion || ready || !styleReady()) return;
    if (!source(map, "dinos")) addLayers(map, theme, result.features);
    // Syncing with an external system (MapLibre): the layers were just added to the map, and this
    // state tells the effects below that they can run. Not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMapWithLayers(map);
  }, [map, result, styleVersion, ready, styleReady, theme]);

  // Points: at most one update per frame (dragging a handle changes the result many times)
  useEffect(() => {
    if (!map || !ready || !result) return;
    const frame = requestAnimationFrame(() => {
      if (styleReady()) source(map, "dinos")?.setData({ type: "FeatureCollection", features: result.features });
    });
    return () => cancelAnimationFrame(frame);
  }, [map, ready, result, styleVersion, styleReady]);

  // Ancient continents: swaps the base map for the time slice's land
  useEffect(() => {
    if (!map || !ready || !styleReady()) return;
    if (timeSlice) source(map, "paleo")?.setData(timeSlice.coasts);
    showPaleo(map, baseLayers(), Boolean(timeSlice));
  }, [map, ready, timeSlice, styleVersion, styleReady, baseLayers]);

  // Ring around the sites found by the search
  useEffect(() => {
    if (!map || !ready || !styleReady()) return;
    source(map, "highlight")?.setData({
      type: "FeatureCollection",
      features: highlight.map((p) => ({ type: "Feature", properties: {}, geometry: p.geometry })),
    });
  }, [map, ready, highlight, styleVersion, styleReady]);

  // Popups (read the filters at click time)
  const currentFilters = useRef(filters);
  useEffect(() => {
    currentFilters.current = filters;
  });
  const popups = useRef<Popups | null>(null);
  useEffect(() => {
    if (!map || !data || !ready) return;
    const p = mountPopups(map, data, () => currentFilters.current);
    popups.current = p;
    return () => {
      p.unmount();
      popups.current = null;
    };
  }, [map, data, ready]);

  // What's on the map changed: the open popup may be showing something that's gone
  useEffect(() => {
    popups.current?.close();
  }, [result]);

  return {
    openPopup: (i: number, coordinates: [number, number], returnFocusTo?: HTMLElement) =>
      popups.current?.open(i, coordinates, returnFocusTo),
    closePopup: () => popups.current?.close(),
  };
}
