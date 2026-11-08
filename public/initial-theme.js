// Sets the theme before the page appears (avoids flashing the light theme for dark-theme users).
// A separate file, not an inline <script>, because the CSP only accepts the site's own scripts.
// Same rule as src/hooks/useTheme.ts: the saved choice wins; with no choice, follows the system.
(function () {
  var saved = null;
  try {
    saved = localStorage.getItem("atlas:theme");
  } catch (e) {
    /* private mode or blocked cookies: follow the system */
  }
  var dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();
