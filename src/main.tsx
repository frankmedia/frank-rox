import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    __roxSetAppHeightInitialized?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__roxSetAppHeightInitialized) {
  const setAppHeight = () => {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
  };

  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.visualViewport?.addEventListener?.("resize", setAppHeight);
  window.__roxSetAppHeightInitialized = true;
}

createRoot(document.getElementById("root")!).render(<App />);
