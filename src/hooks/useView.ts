// Flat map / globe and the globe's automatic rotation.
import { useCallback, useEffect, useState } from "react";
import { reducedMotion, type MapLibreMap } from "../map";
import { readPreference, savePreference } from "../preferences";
import type { View } from "../types";

const DEGREES_PER_SECOND = 5;

const savedView = (): View => (readPreference("view") === "mercator" ? "mercator" : "globe");
const spinsByDefault = (view: View) => view === "globe" && !reducedMotion.matches;

export function useView(map: MapLibreMap | null, styleVersion: number) {
  const [view, setView] = useState<View>(savedView);
  const [spinning, setSpinning] = useState(() => spinsByDefault(savedView()));
  const ready = map !== null && styleVersion > 0;

  // The projection belongs to the style: it comes back on every base-map load (theme switch)
  useEffect(() => {
    if (map && styleVersion) map.setProjection({ type: view });
  }, [map, view, styleVersion]);

  // On the flat map, zooming too far out turns into a repeated strip of the world
  useEffect(() => {
    if (!map || !ready) return;
    map.setMinZoom(view === "mercator" ? 1.2 : 0);
    if (view === "mercator") map.jumpTo({ zoom: Math.max(map.getZoom(), 1.6), pitch: 0, bearing: 0 });
  }, [map, view, ready]);

  // Continuous rotation, frame by frame, at constant speed (independent of the frame rate)
  useEffect(() => {
    if (!map || !ready || !spinning || view !== "globe") return;
    let last = performance.now();
    let frame = requestAnimationFrame(function spin(now) {
      const dt = Math.min(now - last, 100) / 1000; // a background tab doesn't jump
      last = now;
      if (!map.isMoving()) {
        const c = map.getCenter();
        map.setCenter([c.lng - DEGREES_PER_SECOND * dt, c.lat]);
      }
      frame = requestAnimationFrame(spin);
    });
    return () => cancelAnimationFrame(frame);
  }, [map, ready, spinning, view]);

  // Any user interaction with the map stops the rotation
  useEffect(() => {
    if (!map) return;
    const stop = () => setSpinning(false);
    const el = map.getCanvasContainer();
    for (const event of ["pointerdown", "wheel"]) el.addEventListener(event, stop, { passive: true });
    return () => {
      for (const event of ["pointerdown", "wheel"]) el.removeEventListener(event, stop);
    };
  }, [map]);

  const chooseView = useCallback((next: View) => {
    setView(next);
    savePreference("view", next);
    setSpinning(spinsByDefault(next));
  }, []);

  return {
    view,
    chooseView,
    spinning,
    toggleSpin: useCallback(() => setSpinning((s) => !s), []),
    stopSpin: useCallback(() => setSpinning(false), []),
  };
}
