// The app: holds the state (filters, search, data), calculates what's shown and keeps the map up
// to date. The business rules live in the pure modules (filters.ts, search.ts, paleo.ts,
// popup.ts), tested separately; this file only wires that logic to the UI and the map.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MA_SPAN } from "./constants";
import { loadData } from "./data";
import { LISTS, calculate, filtersToURL, filtersFromURL, clearFilters, hasActiveFilter, type ListField } from "./filters";
import { sitesForName, searchableNames, searchSummary } from "./search";
import { histogramPath } from "./histogram";
import { fitToPoints, reducedMotion } from "./map";
import { hasWebGL } from "./support";
import { fmt } from "./text";
import type { Continents, Data, Filters, Point, Result } from "./types";
import type { PaleoState } from "./hooks/useTimeSlice";
import { useLayers } from "./hooks/useLayers";
import { useTimeSlice } from "./hooks/useTimeSlice";
import { useMap } from "./hooks/useMap";
import { useTheme } from "./hooks/useTheme";
import { useView } from "./hooks/useView";
import { SegmentedControl } from "./components/SegmentedControl";
import { MapControls } from "./components/MapControls";
import { Search } from "./components/Search";
import { WIDE_BUTTON, NOTE, LABEL } from "./components/classes";
import { Timeline } from "./components/Timeline";
import { OptionList } from "./components/OptionList";
import { Panel } from "./components/Panel";
import { CountrySelect } from "./components/CountrySelect";
import { About } from "./components/About";

const CONTINENTS: { value: Continents; text: string }[] = [
  { value: "present", text: "Present-day" },
  { value: "ancient", text: "Ancient" },
];
const EMPTY_HISTOGRAM = new Float64Array(MA_SPAN);

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [error, setError] = useState<string | null>(
    hasWebGL ? null : "Your browser doesn’t support WebGL 2, which the map needs. Try updating it or using another browser."
  );
  const showError = useCallback((message: string) => setError((current) => current ?? message), []);
  const [data, setData] = useState<Data | null>(null);
  const [f, setF] = useState<Filters>(() => filtersFromURL(location.search));
  const [dragging, setDragging] = useState(false); // a timeline handle is being dragged
  const [query, setQuery] = useState(""); // searched text

  const mapEl = useRef<HTMLDivElement>(null);
  const panelEl = useRef<HTMLElement>(null);
  const timelineEl = useRef<HTMLElement>(null);

  const mapState = useMap({
    container: mapEl,
    timeline: timelineEl,
    theme,
    enabled: hasWebGL,
    onError: showError,
  });
  const { map, styleVersion } = mapState;
  const { view, chooseView, spinning, toggleSpin, stopSpin } = useView(map, styleVersion);
  const paleo = useTimeSlice(f.continents, f.from, f.to, data?.meta.sites_signature ?? null);

  // Fossil data (the download starts in main.tsx, along with the page)
  useEffect(() => {
    if (!hasWebGL) return;
    let current = true;
    loadData()
      .then((d) => {
        if (!current) return;
        // A country in the URL that doesn't exist in the data: back to "all"
        setF((prev) => (prev.country && !d.countries.some((c) => c.cc === prev.country) ? { ...prev, country: "" } : prev));
        setData(d);
      })
      .catch((e: unknown) => {
        console.error(e);
        if (current) showError("Couldn’t load the fossil data. Please reload the page.");
      });
    return () => {
      current = false;
    };
  }, [showError]);

  // Everything shown (points, counts, histogram) comes from here, recalculated only when something changes
  const result = useMemo(() => (data ? calculate(data, f, paleo.timeSlice) : null), [data, f, paleo.timeSlice]);

  // ---------- Search ----------
  const suggestions = useMemo(() => (data ? searchableNames(data) : []), [data]);
  const match = useMemo(() => (data && query ? sitesForName(data, query) : null), [data, query]);
  const highlight = useMemo(
    () => (match && result ? result.features.filter((p) => match.sites.has(p.id)) : []),
    [match, result]
  );

  // ---------- Map ----------
  const { openPopup, closePopup } = useLayers({ mapState, theme, data, result, timeSlice: paleo.timeSlice, highlight, filters: f });

  const fitPoints = useCallback(
    (features: Point[]) => {
      if (!map) return;
      stopSpin();
      fitToPoints(map, features, panelEl.current);
    },
    [map, stopSpin]
  );

  // When opening with ?country= in the URL and when choosing a country: fits its points
  const fitCountry = useRef(Boolean(f.country));
  useEffect(() => {
    if (!map || !styleVersion || !result || !fitCountry.current) return;
    fitCountry.current = false;
    if (f.country) fitPoints(result.features);
  }, [map, styleVersion, result, f.country, fitPoints]);

  // Filters in the URL (shareable link); while dragging a handle, only at the end
  useEffect(() => {
    if (!dragging) history.replaceState(null, "", filtersToURL(f) || location.pathname);
  }, [f, dragging]);

  // Texts announced to screen readers (count, search summary) don't change on every frame of a
  // handle drag: they use the last result with the handle at rest. (Adjusting state during
  // render: React's pattern for "remembering the last value".)
  const [restingResult, setRestingResult] = useState(result);
  if (!dragging && restingResult !== result) setRestingResult(result);
  const toAnnounce = dragging ? restingResult : result;
  const searchInfo = useMemo(() => {
    if (!data) return "";
    const visible = match && toAnnounce ? toAnnounce.features.filter((p) => match.sites.has(p.id)) : [];
    return searchSummary(data, query, match, visible);
  }, [data, query, match, toAnnounce]);

  function search(text: string) {
    const target = text.trim();
    setQuery(target);
    if (!target || !data || !result || !map) return;
    const { sites } = sitesForName(data, target);
    const visible = result.features.filter((p) => sites.has(p.id));
    if (!visible.length) return;
    closePopup(); // the previous search's popup doesn't stay on top of the new result
    stopSpin();
    if (visible.length > 1) {
      fitPoints(visible);
      return;
    }
    const [p] = visible;
    const center = p.geometry.coordinates as [number, number];
    map.once("moveend", () => openPopup(p.id, center));
    // Zoom above clusterMaxZoom (9): the point shows on its own, outside any cluster
    map.easeTo({ center, zoom: Math.max(map.getZoom(), 9.5), duration: reducedMotion.matches ? 0 : 1000 });
  }

  // ---------- Filter changes ----------
  const changeTime = useCallback((from: number, to: number, nowDragging: boolean) => {
    setDragging(nowDragging);
    setF((prev) => (prev.from === from && prev.to === to ? prev : { ...prev, from, to }));
  }, []);
  const changeList = (field: ListField) => (i: number, checked: boolean) =>
    setF((prev) => ({ ...prev, [field]: prev[field].map((v, k) => (k === i ? checked : v)) }));
  function chooseCountry(cc: string) {
    fitCountry.current = true;
    setF((prev) => ({ ...prev, country: cc }));
  }
  function clear() {
    setF(clearFilters);
    // The button disappears when clearing; keyboard focus moves to the first filter
    document.getElementById("groups-0")?.focus();
  }

  const path = useMemo(() => histogramPath(result?.histogram ?? EMPTY_HISTOGRAM), [result]);
  const [groups, types, diets] = LISTS;

  return (
    <>
      {/* MapLibre sets position: relative on the map element; the outer div pins it to the screen */}
      <div className="absolute inset-0">
        <div ref={mapEl} className="size-full bg-space" />
      </div>

      <Panel ref={panelEl} count={error ?? countText(result)} announcement={error ?? countText(toAnnounce)} error={error !== null}>
        <Search suggestions={suggestions} info={searchInfo} onSearch={search} />

        <p className={`${LABEL} mb-1.5`} id="continents-label">
          Continents
        </p>
        <SegmentedControl
          label="Continents"
          labelledBy="continents-label"
          options={CONTINENTS}
          value={f.continents}
          onChoose={(continents) => setF((prev) => ({ ...prev, continents }))}
        />
        {f.continents === "ancient" && (
          <p className="mt-1.5 text-xs leading-[1.4] text-muted" aria-live="polite">
            {paleoText(paleo, result)}
          </p>
        )}

        <OptionList
          id={groups.field}
          legend="Group"
          options={groups.options}
          checked={f.groups}
          counts={result?.byGroup ?? null}
          onChange={changeList("groups")}
        >
          <p className={NOTE}>
            Each dot is colored by the group with the most records at that site. Birds are theropods too; here they
            have their own group.
          </p>
          <details className="mt-1 text-xs text-muted">
            <summary className="w-fit cursor-pointer text-accent">What’s in “Others”?</summary>
            <p className="mt-1 leading-[1.4]">
              Fossils identified only as dinosaurs, groups outside these four (such as herrerasaurids), and
              eggs and footprints with no assigned group.
            </p>
          </details>
        </OptionList>
        <OptionList
          id={types.field}
          legend="Fossil type"
          collapsible
          options={types.options}
          checked={f.types}
          counts={result?.byType ?? null}
          onChange={changeList("types")}
        />
        <OptionList
          id={diets.field}
          legend="Diet"
          collapsible
          options={diets.options}
          checked={f.diets}
          counts={result?.byDiet ?? null}
          onChange={changeList("diets")}
        >
          <p className={NOTE}>Diet is that of the animal’s group in the PBDB, not something observed in each fossil.</p>
        </OptionList>

        <CountrySelect countries={data?.countries ?? []} byCountry={result?.byCountry ?? null} value={f.country} onChoose={chooseCountry} />

        {hasActiveFilter(f) && (
          <button type="button" onClick={clear} className={`${WIDE_BUTTON} mt-3.5 font-semibold text-accent`}>
            Clear filters
          </button>
        )}

        <About data={data} />
      </Panel>

      <MapControls
        view={view}
        onToggleView={() => chooseView(view === "globe" ? "mercator" : "globe")}
        spinning={spinning}
        onToggleSpin={toggleSpin}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <Timeline
        ref={timelineEl}
        from={f.from}
        to={f.to}
        path={path}
        paleoVisible={Boolean(paleo.timeSlice)}
        onChange={changeTime}
        onRelease={() => setDragging(false)}
      />
    </>
  );
}

function countText(r: Result | null): string {
  if (!r) return "Loading data…";
  if (!r.totalFossils) return "No fossil records match these filters";
  return `${fmt(r.totalFossils)} fossil records at ${fmt(r.features.length)} sites`;
}

function paleoText(paleo: PaleoState, r: Result | null): string {
  if (paleo.error) return "Couldn’t load the ancient continents. Please try again.";
  if (paleo.loading) return `Loading Earth at ${paleo.t} million years ago…`;
  let text = `Earth ${paleo.t} million years ago (middle of the selected range). Present-day coastlines, shown where they were at that time.`;
  if (r?.noPosition) text += ` ${fmt(r.noPosition)} fossil records are hidden: the model can’t reconstruct their location.`;
  return text;
}
