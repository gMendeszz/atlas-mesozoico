// Icon buttons in the right corner, below MapLibre's zoom: globe/flat map, rotation and theme.
// They are map controls (not data filters), so they sit with the map and not in the panel.
import type { ReactNode } from "react";
import type { Theme, View } from "../types";
import { SpinIcon, GlobeIcon, MoonIcon, FlatMapIcon, PauseIcon, SunIcon } from "./Icons";

interface Props {
  view: View;
  onToggleView: () => void;
  spinning: boolean;
  onToggleSpin: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

// Same size and corners as MapLibre's zoom buttons (29 px), so they look like the same family
function Button({ label, children, ...props }: { label: string; children: ReactNode; onClick: () => void; "aria-pressed"?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      className="grid size-[29px] place-items-center text-ink not-last:border-b not-last:border-line hover:bg-track focus-visible:relative"
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </button>
  );
}

export function MapControls({ view, onToggleView, spinning, onToggleSpin, theme, onToggleTheme }: Props) {
  const globe = view === "globe";
  return (
    <div
      role="group"
      aria-label="Map controls"
      // Same background as MapLibre's zoom: white in light mode, the theme background in dark mode (see styles.css)
      // top: below the zoom (10 px margin + 2 buttons of 29 px + 10 px gap)
      className="absolute top-[78px] right-[10px] flex flex-col overflow-hidden rounded bg-field dark:bg-page shadow-[0_0_0_2px_rgb(0_0_0/0.1)]"
    >
      {/* Shows the destination icon: on the globe, the flat map; on the flat map, the globe */}
      <Button label={globe ? "Switch to flat map" : "Switch to globe"} onClick={onToggleView}>
        {globe ? <FlatMapIcon /> : <GlobeIcon />}
      </Button>
      {globe && (
        <Button label={spinning ? "Pause rotation" : "Spin globe"} onClick={onToggleSpin}>
          {spinning ? <PauseIcon /> : <SpinIcon />}
        </Button>
      )}
      <Button label="Dark theme" aria-pressed={theme === "dark"} onClick={onToggleTheme}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </Button>
    </div>
  );
}
