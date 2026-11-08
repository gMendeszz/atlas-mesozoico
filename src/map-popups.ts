// Point popups: clicking opens the site details; hovering shows a quick summary.
// They live outside React (they belong to MapLibre); the content comes from src/popup.ts, already escaped.
import type { MapLayerMouseEvent } from "maplibre-gl";
import { maplibregl, source, type MapLibreMap } from "./map";
import { siteHtml, tooltipHtml } from "./popup";
import { nRecords } from "./text";
import type { Data, Filters, Point } from "./types";

export interface Popups {
  open: (i: number, coordinates: [number, number], returnFocusTo?: HTMLElement) => void;
  close: () => void;
  unmount: () => void;
}

// `filters()` returns the current state (the popup only shows fossils that pass it)
export function mountPopups(map: MapLibreMap, data: Data, filters: () => Filters): Popups {
  let currentPopup: maplibregl.Popup | null = null;
  const tooltip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "tooltip" });
  const hasMouse = matchMedia("(hover: hover)").matches;
  const first = (e: MapLayerMouseEvent) => e.features![0] as unknown as Point;
  const coordinates = (p: Point) => p.geometry.coordinates as [number, number];

  // `returnFocusTo`: opened from the keyboard (site list). Focus moves into the popup so screen
  // readers read it, Escape closes it, and focus goes back to where it came from.
  function open(i: number, lngLat: [number, number], returnFocusTo?: HTMLElement) {
    tooltip.remove();
    currentPopup?.remove();
    const popup = new maplibregl.Popup({ offset: 10, maxWidth: "300px" })
      .setLngLat(lngLat)
      .setHTML(siteHtml(data, i, filters()))
      .addTo(map);
    currentPopup = popup;
    const content = popup.getElement().querySelector<HTMLElement>(".maplibregl-popup-content")!;
    content.setAttribute("role", "dialog");
    content.setAttribute("aria-label", "Site details");
    content.addEventListener("keydown", (e) => {
      if (e.key === "Escape") popup.remove();
    });
    if (returnFocusTo) {
      content.tabIndex = -1;
      content.focus();
      // Only if focus is still inside the popup (closing by clicking elsewhere shouldn't steal it)
      popup.on("close", () => {
        if (!document.activeElement || document.activeElement === document.body || content.contains(document.activeElement)) {
          returnFocusTo.focus();
        }
      });
    }
  }

  const onPointClick = (e: MapLayerMouseEvent) => {
    const p = first(e);
    open(p.id, coordinates(p));
  };
  const onClusterClick = async (e: MapLayerMouseEvent) => {
    const c = e.features![0];
    const zoom = await source(map, "dinos")?.getClusterExpansionZoom(c.properties.cluster_id);
    if (zoom === undefined) return; // base map switching (theme)
    map.easeTo({ center: (c.geometry as Point["geometry"]).coordinates as [number, number], zoom });
  };
  // Summary on hover (only on devices with a mouse)
  const onPointHover = (e: MapLayerMouseEvent) => {
    if (!hasMouse) return;
    const p = first(e);
    tooltip.setLngLat(coordinates(p)).setHTML(tooltipHtml(data, p.id, p.properties.n)).addTo(map);
  };
  const onClusterHover = (e: MapLayerMouseEvent) => {
    if (!hasMouse) return;
    const c = first(e);
    tooltip.setLngLat(coordinates(c)).setHTML(`${nRecords(c.properties.n)} · click to zoom in`).addTo(map);
  };
  const onEnter = () => (map.getCanvas().style.cursor = "pointer");
  const onLeave = () => {
    map.getCanvas().style.cursor = "";
    tooltip.remove();
  };

  map.on("click", "points", onPointClick);
  map.on("click", "clusters", onClusterClick);
  map.on("mousemove", "points", onPointHover);
  map.on("mousemove", "clusters", onClusterHover);
  for (const layer of ["clusters", "points"]) {
    map.on("mouseenter", layer, onEnter);
    map.on("mouseleave", layer, onLeave);
  }

  return {
    open,
    close: () => currentPopup?.remove(),
    unmount: () => {
      map.off("click", "points", onPointClick);
      map.off("click", "clusters", onClusterClick);
      map.off("mousemove", "points", onPointHover);
      map.off("mousemove", "clusters", onClusterHover);
      for (const layer of ["clusters", "points"]) {
        map.off("mouseenter", layer, onEnter);
        map.off("mouseleave", layer, onLeave);
      }
      tooltip.remove();
      currentPopup?.remove();
    },
  };
}
