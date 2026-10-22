import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";
import { browserScheduler } from "../../services/browser-ports";
import type { Scheduler } from "../../services/ports";

/**
 * Load the unit-cost module, then build the catalog on a later turn so the
 * skeleton can paint. The builder is local and synchronous; nothing is fetched.
 */
export function createUnitCostLoader(scheduler: Pick<Scheduler, "frame" | "later"> = browserScheduler) {
  let pending: Promise<UnitCostCatalog> | undefined;
  return function load() {
    if (!pending) {
      pending = import("@cayfore/engine/unit-costs").then(
        ({ buildUnitCostCatalog }) =>
          new Promise((resolve, reject) => {
            const build = () => {
              try {
                resolve(buildUnitCostCatalog());
              } catch (error) {
                reject(error);
              }
            };
            if (typeof requestAnimationFrame === "function") scheduler.frame(() => scheduler.later(build, 0));
            else scheduler.later(build, 0);
          }),
      );
    }
    return pending;
  };
}

export const loadUnitCostCatalog = createUnitCostLoader();
