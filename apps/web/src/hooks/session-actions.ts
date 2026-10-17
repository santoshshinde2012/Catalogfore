import {
  applyRecommendation,
  defaultInstanceId,
  detachSimple,
  normalizePortfolio,
  type Portfolio,
  type RecommendationId,
} from "@cayfore/engine";
import { productById, workloadsForProduct } from "@cayfore/engine/products";
import { toast } from "sonner";
import { planFromPortfolio } from "./forecast-session";
import type { SessionControls } from "./session-controls";
import { ioActions } from "./session-io-actions";
import { planActions } from "./session-plan-actions";

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
        workload.kind === "cluster" ? { ...workload, instanceId: defaultInstanceId(portfolio.cloud) } : workload,
      );
      editPortfolio({ ...portfolio, workloads: [...portfolio.workloads, ...added] });
      setUndo(portfolio);
      setSelectedId(added[0]?.id ?? null);
      controls.setNotice(
        `Added ${product.menuLabel}. Review the default usage and selected-cloud rate coverage before relying on the estimate.`,
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
      toast("Workload removed", {
        action: {
          label: "Undo",
          onClick: () => {
            restore(portfolio);
          },
        },
      });
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
