// Side-by-side single-choice buttons (Present-day/Ancient), with aria-pressed

interface Props<T extends string> {
  label: string; // group name for screen readers
  options: { value: T; text: string }[];
  value: T;
  onChoose: (value: T) => void;
  labelledBy?: string; // id of a label already visible on screen (instead of aria-label)
}

export function SegmentedControl<T extends string>({ label, options, value, onChoose, labelledBy }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className="mb-2 grid grid-cols-2 rounded-lg bg-track p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => o.value !== value && onChoose(o.value)}
          className="min-h-8 rounded-md text-md text-ink aria-pressed:bg-field aria-pressed:font-semibold aria-pressed:shadow-button"
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}
