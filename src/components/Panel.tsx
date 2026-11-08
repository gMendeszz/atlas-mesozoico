// Side panel: title, collapse button, the count and the filters. (Map controls, such as
// globe/flat map and theme, sit in the map corner: see MapControls.tsx.)
import { useId, useState, type ReactNode, type Ref } from "react";
import { ICON_BUTTON, CARD } from "./classes";
import { CollapseIcon } from "./Icons";

interface Props {
  ref?: Ref<HTMLElement>;
  count: string; // on screen, always up to date
  announcement: string; // the same count for screen readers, without changing on every frame of a drag
  error: boolean; // the count is an error message
  children: ReactNode;
}

// On phones the panel starts collapsed so it doesn't cover the map
const startsOpen = () => !matchMedia("(max-width: 600px)").matches;

export function Panel({ ref, count, announcement, error, children }: Props) {
  const [open, setOpen] = useState(startsOpen);
  const bodyId = useId();

  return (
    <aside
      ref={ref}
      aria-label="Filters"
      className={`${CARD} absolute top-4 left-4 w-[280px] max-w-[calc(100%-32px)] max-h-[calc(100dvh-226px)] overflow-y-auto overscroll-contain px-4 pt-3.5 pb-4
        max-sm:top-2.5 max-sm:left-2.5 max-sm:right-14 max-sm:w-auto max-sm:max-w-none max-sm:max-h-[calc(100dvh-220px)]`}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-[-0.01em]">Mesozoic Atlas</h1>
        <button type="button" className={ICON_BUTTON} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          {/* Fixed name: aria-expanded tells whether it's open or closed */}
          <span className="sr-only">Filter panel</span>
          <CollapseIcon className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "" : "rotate-180"}`} />
        </button>
      </div>
      <p className={`mt-0.5 text-md font-semibold tabular-nums ${error ? "text-error" : ""}`} aria-hidden="true">
        {count}
      </p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div id={bodyId} hidden={!open}>
        <p className="mt-1 mb-3 text-[0.8rem] text-muted">Dinosaur fossils · 252–66 million years ago</p>
        {children}
      </div>
    </aside>
  );
}
