import {
  applyRecommendation,
  detachSimple,
  normalizePortfolio,
  type Portfolio,
  type RecommendationId,
} from "@cayfore/engine";
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
