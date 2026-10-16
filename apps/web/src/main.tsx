import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installOptionalAnalytics } from "./analytics";
import { App } from "./App";
import "./index.css";

installOptionalAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
