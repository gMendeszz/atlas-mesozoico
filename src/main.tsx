// Entry point: starts downloading the data right away and mounts the React app.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { loadData } from "./data";
import { hasWebGL } from "./support";

// In parallel with React and the map style (the App picks up the same promise later)
if (hasWebGL) loadData().catch(() => {}); // the App shows the error

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
