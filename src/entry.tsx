import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./main";
import { ErrorBoundary } from "./ErrorBoundary";
import { applyTheme, loadTheme } from "./theme";
applyTheme(loadTheme());
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
