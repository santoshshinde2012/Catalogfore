import {
  applyRecommendation,
  defaultInstanceId,
  findInstance,
  detachSimple,
  normalizePortfolio,
  type Portfolio,
  type RecommendationId,
} from "@cayfore/engine";
import { productById, workloadsForProduct } from "@cayfore/engine/products";
import {
  applyPlanQuantity,
  planQuantityForUnitCost,
  planQuantityUnavailableReason,
  type UnitCostRow,
} from "@cayfore/engine/unit-costs";
import {
  captureForecast as capture,
  restoreForecast as restoreSnapshot,
  type ForecastSnapshot,
} from "./forecast-snapshot";
import { planFromPortfolio } from "./forecast-session";
import type { SessionControls } from "./session-controls";
import { ioActions } from "./session-io-actions";
import { planActions } from "./session-plan-actions";
import { notices } from "../services/notices";
import { showNotice } from "../services/sonner-notifier";

/** State commands delegate file boundaries and model edits to focused modules. */
export function sessionActions(controls: SessionControls) {
  const { portfolio, undo, setOverride, setUndo, setSelectedId } = controls;
  function restore(previous: Portfolio) {
    setOverride(previous);
    const simple = planFromPortfolio(previous);
    if (simple) controls.setPlan(simple);
    else
      controls.setPlan((current) => ({
        ...current,
        cloud: previous.cloud,
        region: previous.region,
        tier: previous.tier,
        commitDiscount: previous.commitment.dbuDiscount,
        monthlyGrowth: Math.pow(1 + previous.forecast.annualGrowth, 1 / 12) - 1,
      }));
    setUndo(null);
    controls.setNotice("Previous forecast restored.");
    setSelectedId((current) =>
      previous.workloads.some((workload) => workload.id === current) ? current : (previous.workloads[0]?.id ?? null),
    );
  }
  function editPortfolio(next: Portfolio) {
    const detached = normalizePortfolio(detachSimple(next));
    setOverride(detached);
    setUndo(null);
    controls.setPlan((current) => ({
      ...current,
      cloud: next.cloud,
      tier: next.tier,
      region: next.region,
      commitDiscount: next.commitment.dbuDiscount,
      monthlyGrowth: Math.pow(1 + next.forecast.annualGrowth, 1 / 12) - 1,
    }));
  }
  return {
    ...planActions(controls),
    ...ioActions(controls),
    captureForecast: () => capture(controls),
    restoreForecast: (snapshot: ForecastSnapshot) => restoreSnapshot(controls, snapshot),
    toggleTheme: () => controls.setTheme((current) => (current === "light" ? "dark" : "light")),
    editPortfolio,
    addProduct: (id: string) => {
      const product = productById(id);
      if (!product || product.listPrice === "unpublished") {
        controls.setNotice(
          "This entry has no supported catalog estimate. Review its documentation and billing context.",
        );
        return false;
      }
      const added = workloadsForProduct(id).map((workload) =>
        workload.kind === "cluster" && !findInstance(portfolio.cloud, workload.instanceId)
          ? { ...workload, instanceId: defaultInstanceId(portfolio.cloud) }
          : workload,
      );
      editPortfolio({ ...portfolio, workloads: [...portfolio.workloads, ...added] });
      setUndo(portfolio);
      setSelectedId(added[0]?.id ?? null);
      controls.setNotice(
        `Added ${product.menuLabel}. Review the default usage and selected-cloud rate coverage before relying on the estimate.`,
      );
      return true;
    },
    applyUnitCost: (row: UnitCostRow, quantity: number) => {
      if (planQuantityForUnitCost(portfolio, row)?.quantity === quantity) return false;
      const update = applyPlanQuantity(portfolio, row, quantity);
      if (!update) {
        controls.setNotice(
          planQuantityUnavailableReason(portfolio, row) ??
            "Enter a supported monthly quantity before applying it to the forecast.",
        );
        return false;
      }
      editPortfolio(update.portfolio);
      setUndo(portfolio);
      setSelectedId(update.selectedId);
      controls.setNotice(
        `Set ${row.productName} to ${quantity.toLocaleString("en-US")} ${row.unit} per baseline month. The forecast applies your discounts, growth or fitted trend, and dated changes.`,
      );
      return true;
    },
    selectWorkload: setSelectedId,
    removeWorkload: (id: string) => {
      setUndo(portfolio);
      const next = normalizePortfolio(
        detachSimple({
          ...portfolio,
          workloads: portfolio.workloads.filter((workload) => workload.id !== id),
        }),
      );
      setOverride(next);
      setSelectedId((current) => (current === id ? null : current));
      showNotice(notices.workloadRemoved(() => restore(portfolio)));
    },
    undoRemove: () => {
      if (undo) {
        restore(undo);
      }
    },
    applyTip: (id: RecommendationId) => {
      const next = detachSimple(applyRecommendation(portfolio, id));
      setUndo(portfolio);
      setOverride(next);
      controls.setPlan((current) => ({ ...current, commitDiscount: next.commitment.dbuDiscount }));
    },
  };
}
