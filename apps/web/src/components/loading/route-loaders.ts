import type { PrefetchTarget } from "../../services/prefetch-plan";
import { createPrefetch } from "../../services/prefetch-plan";
import { browserScheduler } from "../../services/browser-ports";

const routeLoaders: Record<PrefetchTarget, () => Promise<unknown>> = {
  products: () => import("../products/ProductMapPage"),
  rates: () => import("../rates/UnitCostsPage"),
  advanced: () => import("../Ledger"),
  chart: () => import("../simple/ForecastChart"),
  composition: () => import("../simple/CompositionChart"),
};

export const prefetch = createPrefetch(routeLoaders, browserScheduler);

export function loadProductMap() {
  return import("../products/ProductMapPage");
}

export function loadUnitCosts() {
  return import("../rates/UnitCostsPage");
}

export function loadLedger() {
  return import("../Ledger");
}
