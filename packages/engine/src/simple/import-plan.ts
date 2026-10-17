import { clamp } from "../money.js";
import { projectPortfolio } from "../projection.js";
import type { EstimateDependencies } from "../estimate.js";
import { portfolioFromUsage } from "../usage/portfolio.js";
import { bucketDbu, normalizeMix } from "./mix.js";
import { basketForDbu, portfolioShell, workloadsFromBasket } from "./shape.js";
import type { SimplePlan } from "./project.js";

/** Compatibility API: imported costs and placements use the same typed pipeline as Advanced. */
export function importedPlan(plan: SimplePlan, text: string, dependencies?: EstimateDependencies): SimplePlan {
  const base = plan.importedPortfolio ?? portfolioShell(plan, workloadsFromBasket(plan, plan.basket));
  const { portfolio, preview } = portfolioFromUsage(text, { base, mode: "replace" });
  const projection = projectPortfolio(portfolio, dependencies);
  const buckets = bucketDbu(preview);
  const fit = portfolio.usage?.forecast;
  const next: SimplePlan = {
    ...plan,
    cloud: portfolio.cloud,
    tier: portfolio.tier,
    region: portfolio.region,
    monthlySpend: projection.listMonthly,
    mix: normalizeMix(buckets),
    basket: basketForDbu(plan, buckets, dependencies),
    commitDiscount: portfolio.commitment.dbuDiscount,
    monthlyGrowth: fit ? clamp(fit.monthlyGrowth, -0.2, 0.2) : plan.monthlyGrowth,
    importedPortfolio: portfolio,
  };
  delete next.usageForecast;
  delete next.usageDbu;
  if (preview.dbu > 0) next.usageDbu = preview.dbu;
  if (fit) next.usageForecast = fit;
  return next;
}
