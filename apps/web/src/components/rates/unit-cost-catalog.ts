import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";

let pending: Promise<UnitCostCatalog> | undefined;

/**
 * Load the unit-cost module, then build the catalog on a later turn so the
 * skeleton can paint. The builder is local and synchronous; nothing is fetched.
 */
export function loadUnitCostCatalog(): Promise<UnitCostCatalog> {
  if (!pending) {
    pending = import("@cayfore/engine/unit-costs").then(
      ({ buildUnitCostCatalog }) =>
        new Promise((resolve) => {
          const build = () => resolve(buildUnitCostCatalog());
          if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(build, 0));
          else setTimeout(build, 0);
        }),
    );
  }
  return pending;
}
