// Search field for a dinosaur or formation, with suggestions and a summary of the result.
// The field isn't controlled by React: the search runs on the native "change" event (when picking
// a suggestion or pressing Enter), not on every typed letter.
import { memo, useEffect, useId, useRef, useState } from "react";
import { FIELD, LABEL } from "./classes";

interface Props {
  suggestions: string[];
  info: string; // result summary (read by screen readers)
  onSearch: (text: string) => void;
}

export function Search({ suggestions, info, onSearch }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [hasText, setHasText] = useState(false);
  const id = useId();
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // React's onChange is the "input" event (every keystroke); here we need the real "change"
  useEffect(() => {
    const el = input.current!;
    const onChange = () => onSearchRef.current(el.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  function clear() {
    const el = input.current!;
    el.value = "";
    setHasText(false);
    onSearch("");
    el.focus();
  }

  return (
    <div className="mb-3">
      <label className={`${LABEL} mb-1`} htmlFor={`${id}-input`}>
        Search dinosaur or formation
      </label>
      <div className="relative">
        <input
          ref={input}
          id={`${id}-input`}
          type="search"
          list={`${id}-names`}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. Tyrannosaurus, Morrison"
          aria-describedby={`${id}-info`}
          onInput={(e) => {
            const empty = !e.currentTarget.value;
            setHasText(!empty);
            if (empty) onSearch(""); // erased everything
          }}
          className={`${FIELD} min-h-9 py-1.5 pr-[34px] pl-2.5 placeholder:text-placeholder`}
        />
        {hasText && (
          <button
            type="button"
            onClick={clear}
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded text-[1.1rem] leading-none text-muted"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
      <Suggestions id={`${id}-names`} names={suggestions} />
      <p id={`${id}-info`} aria-live="polite" className="mt-1 text-xs leading-[1.4] text-muted empty:hidden">
        {info}
      </p>
    </div>
  );
}

// Thousands of suggestions: memo avoids redrawing the whole list on every search
const Suggestions = memo(function Suggestions({ id, names }: { id: string; names: string[] }) {
  return (
    <datalist id={id}>
      {names.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
});
