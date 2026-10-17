import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { canHydratePrerender } from "./bootstrap";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (canHydratePrerender(root)) hydrateRoot(root, app);
else createRoot(root).render(app);
