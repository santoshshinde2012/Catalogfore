import {
  adjustMix,
  annualGrowthFromMonthly,
  defaultInstanceId,
  defaultPlan,
  listRegions,
  normalizePortfolio,
  planForMix,
  planForPreset,
  planForSpend,
  projectSimple,
  withRates,
  type PlanningEvent,
  type Portfolio,
  type SimplePlan,
} from "@cayfore/engine";
import type { SessionControls } from "./session-controls";
import { planFromPortfolio } from "./forecast-session";
import { planStartingIn } from "../lib/forecast-start";

/** Global assumptions change the active portfolio; only basket controls rebuild workloads. */
export function planActions(controls: SessionControls) {
  const { plan, portfolio, setPlan, setOverride, setUndo, setUsageError } = controls;
  function replacePlan(next: SimplePlan, reset = false) {
    const nextPortfolio = projectSimple(next).portfolio;
    if (!reset) {
      nextPortfolio.name = portfolio.name;
      nextPortfolio.budgetAnnual = portfolio.budgetAnnual;
      nextPortfolio.events = portfolio.events;
      nextPortfolio.commitment.cloudDiscount = portfolio.commitment.cloudDiscount;
      nextPortfolio.forecast = { ...portfolio.forecast, annualGrowth: nextPortfolio.forecast.annualGrowth };
    }
    const normalized = normalizePortfolio(nextPortfolio);
    setUsageError("");
    if (JSON.stringify(normalized) === JSON.stringify(normalizePortfolio(portfolio))) {
      if (reset) {
        setPlan(next);
        setOverride(normalized);
      }
      return;
    }
    setUndo(portfolio);
    setPlan(next);
    setOverride(normalized);
  }
  function patch(next: Portfolio) {
    const normalized = normalizePortfolio(next);
    if (JSON.stringify(normalized) === JSON.stringify(normalizePortfolio(portfolio))) return false;
    setUndo(portfolio);
    setOverride(normalized);
    const simple = planFromPortfolio(normalized);
    setPlan(
      (current) =>
        simple ?? {
          ...current,
          cloud: normalized.cloud,
          region: normalized.region,
          tier: normalized.tier,
          commitDiscount: normalized.commitment.dbuDiscount,
          monthlyGrowth: Math.pow(1 + normalized.forecast.annualGrowth, 1 / 12) - 1,
        },
    );
    return true;
  }
  function placement(next: Pick<Portfolio, "cloud" | "region" | "tier">) {
    if (portfolio.simple) {
      replacePlan(withRates(plan, next));
      return;
    }
    const cloudChanged = next.cloud !== portfolio.cloud;
    const region = listRegions(next.cloud).some((item) => item.id === next.region)
      ? next.region
      : listRegions(next.cloud)[0].id;
    patch({
      ...portfolio,
      ...next,
      region,
      workloads: portfolio.workloads.map((workload) => {
        if (!cloudChanged || workload.cloud || workload.kind !== "cluster") return workload;
        return { ...workload, instanceId: defaultInstanceId(next.cloud) };
      }),
    });
    if (cloudChanged)
      controls.setNotice(
        "Cloud changed. Unpinned clusters use the new cloud’s default machine; review sizing and unpriced products.",
      );
  }
  return {
    replacePlan,
    setCloud: (cloud: Portfolio["cloud"]) => placement({ cloud, tier: portfolio.tier, region: portfolio.region }),
    setTier: (tier: Portfolio["tier"]) => placement({ cloud: portfolio.cloud, tier, region: portfolio.region }),
    setRegion: (region: string) => placement({ cloud: portfolio.cloud, tier: portfolio.tier, region }),
    setSpend: (amount: number) => replacePlan(planForSpend(plan, amount)),
    setPreset: (id: Parameters<typeof planForPreset>[1]) => replacePlan(planForPreset(plan, id)),
    setMix: (key: keyof SimplePlan["mix"], value: number) =>
      replacePlan(planForMix(plan, adjustMix(plan.mix, key, value))),
    setGrowth: (rate: number) => {
      const monthlyGrowth = Math.max(-0.2, Math.min(0.2, rate));
      const next = {
        ...portfolio,
        forecast: { ...portfolio.forecast, annualGrowth: annualGrowthFromMonthly(monthlyGrowth) },
      };
      if (next.usage) {
        next.usage = { ...next.usage };
        delete next.usage.forecast;
      }
      if (next.simple) {
        next.simple = { ...next.simple, monthlyGrowth };
        delete next.simple.usageForecast;
      }
      if (!patch(next)) return;
      setPlan((current) => {
        const updated = { ...current, monthlyGrowth };
        delete updated.usageForecast;
        return updated;
      });
    },
    setCommit: (rate: number) => {
      const dbuDiscount = Math.max(0, Math.min(0.95, rate));
      patch({
        ...portfolio,
        commitment: { ...portfolio.commitment, dbuDiscount },
        ...(portfolio.simple ? { simple: { ...portfolio.simple, commitDiscount: dbuDiscount } } : {}),
      });
    },
    setCloudDiscount: (rate: number) =>
      patch({
        ...portfolio,
        commitment: { ...portfolio.commitment, cloudDiscount: Math.max(0, Math.min(0.95, rate)) },
      }),
    setBudget: (amount: number | undefined) =>
      patch({
        ...portfolio,
        budgetAnnual: amount != null && Number.isFinite(amount) && amount >= 0 ? amount : undefined,
      }),
    setForecastStart: (month: string) => {
      if (!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month) || portfolio.forecast.startMonth === month) return false;
      const updated = planStartingIn(portfolio, month);
      patch(updated.portfolio);
      return updated.resetLegacyFit;
    },
    setEvents: (events: PlanningEvent[]) => patch({ ...portfolio, events }),
    reset: () => {
      controls.loadRequest.current += 1;
      controls.setUsageBusy(false);
      controls.setUsageProgress(null);
      controls.setUsagePreview(null);
      replacePlan(defaultPlan(), true);
    },
    resetToQuick: () =>
      replacePlan(planForSpend({ ...plan, usageDbu: undefined, usageForecast: undefined }, plan.monthlySpend)),
    clearUsage: () =>
      replacePlan(planForSpend({ ...plan, usageDbu: undefined, usageForecast: undefined }, plan.monthlySpend)),
  };
}
