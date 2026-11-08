// List of checkboxes with the count for each option (group, fossil type, diet).
// For groups, the color dot makes the list the map legend too (it stays open).
// The others can be collapsible, showing a summary next to the title ("All", "2 of 5").
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Group, Option } from "../constants";
import { fmt } from "../text";
import { LABEL } from "./classes";
import { ChevronIcon } from "./Icons";

interface Props {
  id: string; // checkbox id prefix (`${id}-0`, `${id}-1`...)
  legend: string;
  options: (Option | Group)[];
  checked: boolean[];
  counts: number[] | null; // null while the data loads
  onChange: (i: number, checked: boolean) => void;
  collapsible?: boolean;
  children?: ReactNode; // notes below the list
}

const hasColor = (o: Option | Group): o is Group => "color" in o;

function summary(checked: boolean[]): string {
  const n = checked.filter(Boolean).length;
  if (n === checked.length) return "All";
  if (n === 0) return "None";
  return `${n} of ${checked.length}`;
}

export function OptionList({ id, legend, options, checked, counts, onChange, collapsible, children }: Props) {
  // Starts open if it already comes with a filter (shared link), to show what's active
  const [open, setOpen] = useState(() => !checked.every(Boolean));
  const all = checked.every(Boolean);

  const list = (
    <fieldset className="min-w-0">
      <legend className={collapsible ? "sr-only" : `${LABEL} mb-1.5`}>{legend}</legend>
      <div className="grid gap-0.5">
        {options.map((o, i) => (
          <label
            key={o.key}
            className={`flex min-h-[30px] cursor-pointer items-center gap-2 text-md ${counts?.[i] === 0 ? "opacity-55" : ""}`}
          >
            <input
              id={`${id}-${i}`}
              type="checkbox"
              checked={checked[i]}
              onChange={(e) => onChange(i, e.target.checked)}
              className="m-0 size-4 flex-none accent-ink"
            />
            {hasColor(o) && (
              <span className="dot" style={{ "--color": o.color, "--dark-color": o.darkColor } as CSSProperties} aria-hidden="true" />
            )}
            {o.name}
            <span className="ml-auto text-muted tabular-nums">{counts ? fmt(counts[i]) : ""}</span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );

  if (!collapsible) return <div className="mt-3.5 mb-3">{list}</div>;

  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group border-t border-line">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <ChevronIcon className="flex-none text-muted transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
        <span className={LABEL}>{legend}</span>
        {/* With an active filter, the summary is highlighted: the filter shows even with the section closed */}
        <span className={`ml-auto text-sm ${all ? "text-muted" : "font-semibold text-accent"}`}>{summary(checked)}</span>
      </summary>
      <div className="pb-2.5">{list}</div>
    </details>
  );
}
