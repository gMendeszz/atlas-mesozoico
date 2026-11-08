// List of the visible sites (or the search results): an alternative to the map for keyboard and
// screen-reader users, who can't reach the points on the map. Each item shows the site on the map
// and opens its details with focus inside; Escape returns here.
import { useEffect, useRef, useState } from "react";
import { PERIODS } from "../constants";
import { placeOfSite } from "../data";
import { fmt, nRecords } from "../text";
import type { Data, Point } from "../types";
import { LABEL } from "./classes";
import { ChevronIcon } from "./Icons";

const PAGE = 25;

interface Props {
  data: Data | null;
  sites: Point[]; // already filtered and sorted (sitesForList)
  searching: boolean;
  onShow: (site: Point, button: HTMLElement) => void;
}

export function SiteList({ data, sites, searching, onShow }: Props) {
  const [limit, setLimit] = useState(PAGE);
  const list = useRef<HTMLOListElement>(null);
  const focusFrom = useRef<number | null>(null); // after "Show more": focus the first new item
  // A new list (filters or search changed) starts again from the first page. (Adjusting state
  // during render: React's pattern for resetting state when a prop changes.)
  const [shownList, setShownList] = useState(sites);
  if (shownList !== sites) {
    setShownList(sites);
    setLimit(PAGE);
  }

  useEffect(() => {
    if (focusFrom.current === null) return;
    list.current?.querySelectorAll("button")[focusFrom.current]?.focus();
    focusFrom.current = null;
  }, [limit]);

  function showMore() {
    focusFrom.current = limit;
    setLimit(limit + PAGE);
  }

  return (
    <details className="group border-t border-line">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <ChevronIcon className="flex-none text-muted transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
        <span className={LABEL}>{searching ? "Search results as a list" : "Sites as a list"}</span>
        <span className="ml-auto text-sm text-muted tabular-nums">{data ? fmt(sites.length) : ""}</span>
      </summary>
      <div className="pb-2.5">
        <p className="mb-1.5 text-xs text-muted">
          {searching ? "Sites matching the search" : "Sites matching the filters"}, most records first. Choose one to show
          it on the map.
        </p>
        {data && sites.length > 0 && (
          <ol ref={list} className="grid gap-0.5">
            {sites.slice(0, limit).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={(e) => onShow(p, e.currentTarget)}
                  className="w-full rounded-md px-1.5 py-1 text-left hover:bg-track"
                >
                  <span className="block text-md">{placeOfSite(data, p.id) || "Unnamed site"}</span>
                  <span className="block text-xs text-muted">
                    {PERIODS[data.period[p.id]].name} · {nRecords(p.properties.n)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {data && sites.length === 0 && <p className="text-xs text-muted">No sites match.</p>}
        {sites.length > limit && (
          <button type="button" onClick={showMore} className="mt-1.5 text-sm font-semibold text-accent">
            Show {Math.min(PAGE, sites.length - limit)} more ({fmt(sites.length - limit)} left)
          </button>
        )}
      </div>
    </details>
  );
}
