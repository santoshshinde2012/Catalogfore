import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { installOptionalAnalytics } from "./analytics";
import { App } from "./App";
import "./index.css";

installOptionalAnalytics();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (root.hasAttribute("data-prerender")) hydrateRoot(root, app);
else createRoot(root).render(app);
