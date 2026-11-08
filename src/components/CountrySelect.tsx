// Country selector, showing how many fossils each one has under the current filters
import { useId } from "react";
import { fmt } from "../text";
import type { Country } from "../types";
import { FIELD, LABEL } from "./classes";

interface Props {
  countries: Country[];
  byCountry: Uint32Array | null;
  value: string;
  onChoose: (cc: string) => void;
}

export function CountrySelect({ countries, byCountry, value, onChoose }: Props) {
  const id = useId();
  const n = (v: number) => (byCountry ? ` (${fmt(v)})` : "");
  const total = byCountry ? byCountry.reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="border-t border-line pt-2.5 pb-3">
      <label className={`${LABEL} mb-1.5`} htmlFor={id}>
        Country
      </label>
      <select id={id} value={value} onChange={(e) => onChoose(e.target.value)} className={`${FIELD} min-h-[34px] px-2 py-1`}>
        <option value="">{`All countries${n(total)}`}</option>
        {/* "No country" has no code to filter by; it's left out */}
        {countries
          .filter((c) => c.cc)
          .map((c) => (
            <option key={c.cc} value={c.cc}>
              {`${c.name}${n(byCountry?.[c.idx] ?? 0)}`}
            </option>
          ))}
      </select>
    </div>
  );
}
