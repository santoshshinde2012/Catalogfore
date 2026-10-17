import { referenceRegion } from "../catalog.js";
import type { EstimateDependencies } from "../estimate.js";
import { clamp } from "../money.js";
import type { SimpleBasket, WorkloadMix } from "../types.js";
import { normalizeMix } from "./mix.js";
import { teamPreset, type TeamPresetId } from "./presets.js";
import type { SimplePlan } from "./project.js";
import { basketForSpend } from "./shape.js";
import { annualGrowthFromMonthly } from "./growth.js";

/** Simple-page default. Three percent per month, not the 8% annual growth on a blank advanced portfolio. */
const DEFAULT_MONTHLY_GROWTH = 0.03;

const EMPTY_BASKET: SimpleBasket = { etlNodes: 0, etlHoursPerDay: 0, sqlClusters: 0, mlInputTokens: 0 };

function withoutUsage(plan: SimplePlan): SimplePlan {
  const next = { ...plan };
  delete next.usageDbu;
  delete next.usageForecast;
  delete next.importedPortfolio;
  return next;
}

function withoutForecast(plan: SimplePlan): SimplePlan {
  const next = { ...plan };
  delete next.usageForecast;
  return next;
}

/** Resize the basket so the list month matches a typed dollar amount. */
export function planForSpend(plan: SimplePlan, monthlySpend: number, dependencies?: EstimateDependencies): SimplePlan {
  const spend = clamp(Number.isFinite(monthlySpend) ? monthlySpend : 0, 0, 1e9);
  const basket = basketForSpend(plan, spend, plan.mix, dependencies);
  return { ...withoutUsage(plan), monthlySpend: spend, basket };
}

/** Keep the monthly amount and change the mix. */
export function planForMix(plan: SimplePlan, mix: WorkloadMix, dependencies?: EstimateDependencies): SimplePlan {
  const next = { ...withoutUsage(plan), mix: normalizeMix(mix) };
  return planForSpend(next, plan.monthlySpend, dependencies);
}

/** Replace the amount and the mix with a named team size. */
export function planForPreset(plan: SimplePlan, id: TeamPresetId, dependencies?: EstimateDependencies): SimplePlan {
  const preset = teamPreset(id);
  return planForSpend({ ...withoutUsage(plan), mix: preset.mix }, preset.monthlySpend, dependencies);
}

/** Set monthly growth and drop a fitted series so the control is the path again. */
export function withGrowth(plan: SimplePlan, monthlyGrowth: number): SimplePlan {
  const next = {
    ...withoutForecast(plan),
    monthlyGrowth: clamp(Number.isFinite(monthlyGrowth) ? monthlyGrowth : 0, -0.2, 0.2),
  };
  if (plan.importedPortfolio) {
    const portfolio = {
      ...plan.importedPortfolio,
      forecast: { ...plan.importedPortfolio.forecast, annualGrowth: annualGrowthFromMonthly(next.monthlyGrowth) },
    };
    if (portfolio.usage) {
      portfolio.usage = { ...portfolio.usage };
      delete portfolio.usage.forecast;
    }
    next.importedPortfolio = portfolio;
  }
  return next;
}

/** Set the Databricks commitment discount. Cloud machines are unchanged. */
export function withCommit(plan: SimplePlan, commitDiscount: number): SimplePlan {
  const discount = clamp(Number.isFinite(commitDiscount) ? commitDiscount : 0, 0, 0.95);
  return {
    ...plan,
    commitDiscount: discount,
    ...(plan.importedPortfolio
      ? {
          importedPortfolio: {
            ...plan.importedPortfolio,
            commitment: { ...plan.importedPortfolio.commitment, dbuDiscount: discount },
          },
        }
      : {}),
  };
}

/** AWS Premium, US East, medium team, 3% monthly growth. */
export function defaultPlan(dependencies?: EstimateDependencies): SimplePlan {
  return planForPreset(
    {
      cloud: "aws",
      tier: "premium",
      region: referenceRegion.aws,
      monthlySpend: 0,
      mix: { etl: 1, sql: 0, ml: 0 },
      monthlyGrowth: DEFAULT_MONTHLY_GROWTH,
      commitDiscount: 0,
      basket: EMPTY_BASKET,
    },
    "medium",
    dependencies,
  );
}
