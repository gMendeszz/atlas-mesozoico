// Light/dark theme. With no saved choice, follows the system (and tracks it if it changes).
// Choosing the same theme as the system deletes the choice: back to following the system.
// The initial theme is already set on <html> by public/initial-theme.js (before the page appears).
import { useCallback, useEffect, useState } from "react";
import { deletePreference, readPreference, savePreference } from "../preferences";
import type { Theme } from "../types";

const systemDark = matchMedia("(prefers-color-scheme: dark)");
const BAR_COLOR: Record<Theme, string> = { light: "#fbf8f2", dark: "#1d1a16" }; // browser bar on phones

const systemTheme = (): Theme => (systemDark.matches ? "dark" : "light");
function chosenTheme(): Theme {
  const saved = readPreference("theme");
  return saved === "light" || saved === "dark" ? saved : systemTheme();
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = BAR_COLOR[theme];
  }, [theme]);

  useEffect(() => {
    const onSystemChange = () => setTheme(chosenTheme());
    systemDark.addEventListener("change", onSystemChange);
    return () => systemDark.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === systemTheme()) deletePreference("theme");
    else savePreference("theme", next);
    setTheme(next);
  }, [theme]);

  return [theme, toggle];
}
