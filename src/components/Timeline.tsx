// Timeline: fossil histogram, two handles for the range and period shortcuts.
// Also carries the data credits (always visible at the bottom).
import { useEffect, useRef, type Ref } from "react";
import { MA_END, MA_GAP, MA_START, MA_SPAN, PERIODS } from "../constants";
import { fmtMa } from "../text";
import { CARD, LABEL } from "./classes";

interface Props {
  ref?: Ref<HTMLElement>;
  from: number;
  to: number;
  path: string; // histogram drawing (histogramPath)
  paleoVisible: boolean; // shows the ancient-continents credit
  // `dragging`: the handle is still being dragged (the app updates the map, but not the URL)
  onChange: (from: number, to: number, dragging: boolean) => void;
  onRelease: () => void; // finished dragging (or adjusting with the keyboard)
}

const SCALE = [252, 201, 145, 66];
const same = (a: number, b: number) => Math.abs(a - b) < 0.05;

export function Timeline({ ref, from, to, path, paleoVisible, onChange, onRelease }: Props) {
  const fromHandle = useRef<HTMLInputElement>(null);
  const toHandle = useRef<HTMLInputElement>(null);
  // Handle position: 0 = 252 Ma (left, oldest), 186 = 66 Ma
  const tFrom = MA_START - from;
  const tTo = MA_START - to;
  const whole = from >= MA_START && to <= MA_END;

  // Releasing the handle (native "change" event; React's onChange fires on every movement).
  // Only signals that it stopped: the values already arrived through onChange.
  const onReleaseRef = useRef(onRelease);
  useEffect(() => {
    onReleaseRef.current = onRelease;
  });
  useEffect(() => {
    const release = () => onReleaseRef.current();
    const handles = [fromHandle.current!, toHandle.current!];
    for (const h of handles) h.addEventListener("change", release);
    return () => {
      for (const h of handles) h.removeEventListener("change", release);
    };
  }, []);

  function wholeMesozoic() {
    onChange(MA_START, MA_END, false);
    fromHandle.current?.focus(); // the button disappears; focus moves to the handle
  }

  return (
    <div className="pointer-events-none absolute right-4 bottom-[30px] left-4 flex justify-center max-sm:right-2 max-sm:left-2">
      <section
        ref={ref}
        aria-labelledby="timeline-title"
        className={`${CARD} pointer-events-auto w-[min(720px,100%)] px-3.5 pt-2 pb-1.5 max-sm:px-2.5 max-sm:pt-1.5 max-sm:pb-1`}
      >
        <div className="flex min-h-[26px] items-baseline gap-2.5">
          <h2 id="timeline-title" className={`${LABEL} max-sm:sr-only`}>
            Time
          </h2>
          <output htmlFor="range-from range-to" className="text-md font-semibold tabular-nums max-sm:text-sm">
            {fmtMa(from)} – {fmtMa(to)} million years ago
          </output>
          <span className="text-xs text-muted max-sm:hidden" aria-hidden="true">
            · height = number of fossil records
          </span>
          {!whole && (
            <button
              type="button"
              onClick={wholeMesozoic}
              className="ml-auto min-h-[26px] rounded-md px-2 py-0.5 text-sm font-semibold text-accent max-sm:px-1 max-sm:whitespace-nowrap"
            >
              Whole Mesozoic
            </button>
          )}
        </div>

        <div className="relative h-11">
          <svg
            viewBox={`0 0 ${MA_SPAN} 40`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute top-0.5 left-[11px] h-[42px] w-[calc(100%-22px)]"
          >
            <path d={path} className="fill-histogram" />
            {/* Outside the selected range is faded */}
            <rect x="0" y="0" width={tFrom} height="40" className="fill-page opacity-72" />
            <rect x={tTo} y="0" width={MA_SPAN - tTo} height="40" className="fill-page opacity-72" />
          </svg>
          <input
            ref={fromHandle}
            id="range-from"
            type="range"
            min="0"
            max={MA_SPAN}
            step="1"
            value={Math.round(tFrom)}
            aria-label="Range start"
            aria-valuetext={`${fmtMa(from)} million years ago`}
            onChange={(e) => onChange(Math.max(MA_START - +e.target.value, to + MA_GAP), to, true)}
            // Overlapping handles: the one further right goes underneath, so both can always be grabbed
            style={{ zIndex: tFrom > MA_SPAN / 2 ? 2 : 1 }}
            className="handle absolute inset-0 m-0 size-full"
          />
          <input
            ref={toHandle}
            id="range-to"
            type="range"
            min="0"
            max={MA_SPAN}
            step="1"
            value={Math.round(tTo)}
            aria-label="Range end"
            aria-valuetext={`${fmtMa(to)} million years ago`}
            onChange={(e) => onChange(from, Math.min(MA_START - +e.target.value, from - MA_GAP), true)}
            className="handle absolute inset-0 m-0 size-full"
          />
        </div>

        <div className="relative mx-[11px] mt-0.5 h-3.5 text-2xs text-muted tabular-nums" aria-hidden="true">
          {SCALE.map((ma, k) => (
            <span
              key={ma}
              style={{ left: `${((MA_START - ma) / MA_SPAN) * 100}%` }}
              className={`absolute ${k === 0 ? "" : k === SCALE.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            >
              {ma}
            </span>
          ))}
        </div>

        <div className="mx-[11px] mt-[3px] flex gap-[3px]" role="group" aria-label="Period shortcuts">
          {PERIODS.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={same(p.from, from) && same(p.to, to)}
              title={`${p.name}: ${fmtMa(p.from)}–${fmtMa(p.to)} million years ago`}
              onClick={() => onChange(p.from, p.to, false)}
              style={{ flex: p.from - p.to }}
              className="min-h-7 min-w-0 overflow-hidden rounded-[5px] bg-track px-1 py-0.5 text-sm text-ellipsis whitespace-nowrap text-ink hover:not-aria-pressed:bg-track-strong aria-pressed:bg-ink aria-pressed:font-semibold aria-pressed:text-on-ink"
            >
              {p.name}
            </button>
          ))}
        </div>

        <Credits paleoVisible={paleoVisible} />
      </section>
    </div>
  );
}

function Link({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children}
    </a>
  );
}

function Credits({ paleoVisible }: { paleoVisible: boolean }) {
  return (
    // Links padded to a 24px-tall click area (inline padding: the line height doesn't change)
    <footer className="mt-1.5 text-2xs text-muted [&_a]:py-[5px]">
      Data:{" "}
      <a href="https://paleobiodb.org" target="_blank" rel="noopener">
        Paleobiology Database<span className="sr-only"> (opens in a new tab)</span>
      </a>
      {paleoVisible && (
        <span>
          {" "}
          · Ancient continents: <Link href="https://doi.org/10.5281/zenodo.10596609">PALEOMAP (Scotese 2016)</Link> via{" "}
          <Link href="https://gplates.org">GPlates</Link>, CC BY 4.0
        </span>
      )}
    </footer>
  );
}
