const loaders = {
  products: () => import("../products/ProductMapPage"),
  rates: () => import("../rates/UnitCostsPage"),
  advanced: () => import("../Ledger"),
  chart: () => import("../simple/ForecastChart"),
  composition: () => import("../simple/CompositionChart"),
};

export type PrefetchTarget = keyof typeof loaders;

export function loadProductMap() {
  return loaders.products();
}

export function loadUnitCosts() {
  return loaders.rates();
}

export function loadLedger() {
  return loaders.advanced();
}

/** Warm a route chunk. Repeated calls share the browser module cache. */
export function prefetchDestination(target: PrefetchTarget) {
  void loaders[target]().catch(() => undefined);
}

export function prefetchIdleRoutes() {
  const warm = () => {
    prefetchDestination("chart");
    prefetchDestination("composition");
    prefetchDestination("advanced");
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(warm, { timeout: 1800 });
  else window.setTimeout(warm, 400);
}
