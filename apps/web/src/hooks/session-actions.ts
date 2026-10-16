import {
  applyRecommendation,
  defaultPlan,
  normalizePortfolio,
  planForMix,
  planForPreset,
  planForSpend,
  planFromUsage,
  withCommit,
  withGrowth,
  withRates,
  adjustMix,
  type Portfolio,
  type RecommendationId,
  type SimplePlan,
} from "@cayfore/engine";
import { toast } from "sonner";
import { planFromPortfolio, type SimpleSession, type Theme } from "./forecast-session";

interface SessionControls {
  plan: SimplePlan;
  portfolio: Portfolio;
  override: Portfolio | null;
  undo: Portfolio | null;
  setPlan: (plan: SimplePlan | ((current: SimplePlan) => SimplePlan)) => void;
  setOverride: (portfolio: Portfolio | null) => void;
  setUndo: (portfolio: Portfolio | null) => void;
  setSelectedId: (id: string | null | ((current: string | null) => string | null)) => void;
  setNotice: (notice: string) => void;
  setUsageError: (error: string) => void;
  setUsageBusy: (busy: boolean) => void;
  setTheme: (theme: Theme | ((current: Theme) => Theme)) => void;
}

/** Commands for the simple page. The hook keeps the state. These functions only change it. */
export function sessionActions(
  controls: SessionControls,
): Pick<
  SimpleSession,
  | "setCloud"
  | "setTier"
  | "setRegion"
  | "setSpend"
  | "setPreset"
  | "setMix"
  | "setGrowth"
  | "setCommit"
  | "loadUsageText"
  | "loadUsageFile"
  | "loadSample"
  | "clearUsage"
  | "share"
  | "reset"
  | "toggleTheme"
  | "loadForecastFile"
  | "editPortfolio"
  | "selectWorkload"
  | "removeWorkload"
  | "undoRemove"
  | "applyTip"
> {
  const {
    plan,
    portfolio,
    override,
    undo,
    setPlan,
    setOverride,
    setUndo,
    setSelectedId,
    setNotice,
    setUsageError,
    setUsageBusy,
    setTheme,
  } = controls;

  function replacePlan(next: SimplePlan) {
    setOverride(null);
    setUndo(null);
    setUsageError("");
    setPlan(next);
  }

  function loadUsageText(text: string) {
    const loaded = planFromUsage(plan, text);
    if (!loaded.ok) {
      setUsageError(loaded.error);
      return;
    }
    replacePlan(loaded.plan);
  }

  return {
    setCloud: (cloud) => replacePlan(withRates(plan, { cloud, tier: plan.tier, region: plan.region })),
    setTier: (tier) => replacePlan(withRates(plan, { cloud: plan.cloud, tier, region: plan.region })),
    setRegion: (region) => replacePlan(withRates(plan, { cloud: plan.cloud, tier: plan.tier, region })),
    setSpend: (amount) => replacePlan(planForSpend(plan, amount)),
    setPreset: (id) => replacePlan(planForPreset(plan, id)),
    setMix: (key, value) => replacePlan(planForMix(plan, adjustMix(plan.mix, key, value))),
    setGrowth: (rate) => replacePlan(withGrowth(plan, rate)),
    setCommit: (rate) => replacePlan(withCommit(plan, rate)),
    loadUsageText,
    loadUsageFile: (file) => {
      setUsageBusy(true);
      void file.text().then((text) => {
        loadUsageText(text);
        setUsageBusy(false);
      });
    },
    loadSample: () => {
      setUsageBusy(true);
      setUsageError("");
      void fetch(`${import.meta.env.BASE_URL}sample-usage.csv`)
        .then((response) => {
          if (!response.ok) throw new Error("missing");
          return response.text();
        })
        .then((text) => loadUsageText(text))
        .catch(() => setUsageError("The sample file did not load."))
        .finally(() => setUsageBusy(false));
    },
    clearUsage: () => replacePlan(planForSpend({ ...plan, usageDbu: undefined }, plan.monthlySpend)),
    share: async () => {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
        toast.success("Link copied");
      } catch {
        window.prompt("Copy this link", url);
      }
      window.setTimeout(() => setNotice(""), 2500);
    },
    reset: () => replacePlan(defaultPlan()),
    toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
    loadForecastFile: (file) => {
      void file.text().then((text) => {
        try {
          const parsed = JSON.parse(text) as { portfolio?: unknown };
          const decoded = normalizePortfolio(parsed.portfolio ?? parsed);
          const simple = planFromPortfolio(decoded);
          if (simple) replacePlan(simple);
          else {
            const detached = { ...decoded };
            delete detached.simple;
            setPlan((current) => ({ ...current, cloud: decoded.cloud, tier: decoded.tier, region: decoded.region }));
            setOverride(detached);
            setSelectedId(detached.workloads[0]?.id ?? null);
          }
        } catch {
          window.alert("That file is not a forecast JSON.");
        }
      });
    },
    editPortfolio: (next) => {
      const detached = { ...next };
      delete detached.simple;
      setOverride(detached);
      setUndo(null);
    },
    selectWorkload: setSelectedId,
    removeWorkload: (id) => {
      const previous = portfolio;
      setUndo(previous);
      const next = { ...portfolio, workloads: portfolio.workloads.filter((workload) => workload.id !== id) };
      delete next.simple;
      setOverride(next);
      setSelectedId((current) => (current === id ? null : current));
      toast("Workload removed", {
        action: {
          label: "Undo",
          onClick: () => {
            setOverride(previous);
            setUndo(null);
          },
        },
      });
    },
    undoRemove: () => {
      if (!undo) return;
      setOverride(undo);
      setUndo(null);
    },
    applyTip: (id: RecommendationId) => {
      if (!override && (id === "commit_37" || id === "commit_37_cloud_30")) {
        replacePlan(withCommit(plan, Math.max(plan.commitDiscount, 0.37)));
        return;
      }
      const next = applyRecommendation(portfolio, id);
      delete next.simple;
      setOverride(next);
    },
  };
}
