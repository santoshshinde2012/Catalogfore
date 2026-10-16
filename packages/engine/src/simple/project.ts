import { regionInfo } from "../catalog.js";
import { referenceRegion } from "../catalog.js";
import { estimate, type EstimateDependencies } from "../estimate.js";
import { defaultEstimateDependencies } from "../costing/estimate-portfolio.js";
import { annualTotal, forecast } from "../forecast.js";
import { clamp, roundMoney } from "../money.js";
import { uncertaintyBand, uncertaintyFactors, type UncertaintyBand } from "../recommend.js";
import type { Cloud, Estimate, ForecastPoint, Portfolio, SimpleBasket, Tier, WorkloadMix } from "../types.js";
import { importUsageCsv } from "../usage.js";
import { bucketDbu, normalizeMix } from "./mix.js";
import { teamPreset, type TeamPresetId } from "./presets.js";
import {
  annualGrowthFromMonthly,
  basketForDbu,
  basketForSpend,
  portfolioShell,
  regionFor,
  workloadsFromBasket,
} from "./shape.js";

export interface SimplePlan {
  cloud: Cloud;
  tier: Tier;
  region: string;
  monthlySpend: number;
  mix: WorkloadMix;
  monthlyGrowth: number;
  commitDiscount: number;
  basket: SimpleBasket;
  usageDbu?: number;
}

export interface SimpleMonth {
  month: number;
  low: number;
  expected: number;
  high: number;
}

export interface SimpleProjection {
  plan: SimplePlan;
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  months: SimpleMonth[];
  annual: number;
  band: UncertaintyBand;
  spreadPercent: number;
  listMonthly: number;
  cloudShare: number;
  assumptions: string[];
}

const EMPTY_BASKET: SimpleBasket = { etlNodes: 0, etlHoursPerDay: 0, sqlClusters: 0, mlInputTokens: 0 };

export function projectSimple(
  plan: SimplePlan,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): SimpleProjection {
  const region = regionFor(plan.cloud, plan.region);
  const normalized = { ...plan, region, mix: normalizeMix(plan.mix) };
  let portfolio = portfolioShell(normalized, workloadsFromBasket(normalized, normalized.basket));
  if (normalized.usageDbu && normalized.usageDbu > 0) {
    const probe = estimate(portfolio, dependencies);
    const scale = probe.dbu > 0 ? clamp(normalized.usageDbu / probe.dbu, 0.0001, 1000) : 1;
    portfolio = { ...portfolio, usageScale: snapScale(scale), usageCalibrated: true };
  }
  const result = estimate(portfolio, dependencies);
  const points = forecast(result, portfolio.forecast);
  const rolled = rollForward(portfolio, result, points);
  const { annual, band, months } = rolled;
  const listMonthly = rolled.listMonthly;
  const stored: SimplePlan = {
    ...normalized,
    monthlySpend: roundMoney(normalized.monthlySpend),
    commitDiscount: portfolio.commitment.dbuDiscount,
    monthlyGrowth: portfolio.simple?.monthlyGrowth ?? normalized.monthlyGrowth,
    basket: portfolio.simple?.basket ?? normalized.basket,
    ...(portfolio.simple?.usageDbu ? { usageDbu: portfolio.simple.usageDbu } : {}),
  };
  return {
    plan: stored,
    portfolio,
    estimate: result,
    points,
    months,
    annual,
    band,
    spreadPercent: rolled.spreadPercent,
    listMonthly,
    cloudShare: rolled.cloudShare,
    assumptions: explain(stored, result, band),
  };
}

export function planForSpend(plan: SimplePlan, monthlySpend: number, dependencies?: EstimateDependencies): SimplePlan {
  const spend = clamp(Number.isFinite(monthlySpend) ? monthlySpend : 0, 0, 1e9);
  const basket = basketForSpend(plan, spend, plan.mix, dependencies);
  return { ...withoutUsage(plan), monthlySpend: spend, basket };
}

export function planForMix(plan: SimplePlan, mix: WorkloadMix, dependencies?: EstimateDependencies): SimplePlan {
  const next = { ...withoutUsage(plan), mix: normalizeMix(mix) };
  return planForSpend(next, plan.monthlySpend, dependencies);
}

export function planForPreset(plan: SimplePlan, id: TeamPresetId, dependencies?: EstimateDependencies): SimplePlan {
  const preset = teamPreset(id);
  return planForSpend({ ...withoutUsage(plan), mix: preset.mix }, preset.monthlySpend, dependencies);
}

export function withRates(
  plan: SimplePlan,
  next: { cloud: Cloud; tier: Tier; region: string },
  dependencies?: EstimateDependencies,
): SimplePlan {
  const draft: SimplePlan = { ...plan, cloud: next.cloud, tier: next.tier, region: regionFor(next.cloud, next.region) };
  return { ...draft, monthlySpend: projectSimple(draft, dependencies).listMonthly };
}

export function withGrowth(plan: SimplePlan, monthlyGrowth: number): SimplePlan {
  return { ...plan, monthlyGrowth: clamp(Number.isFinite(monthlyGrowth) ? monthlyGrowth : 0, 0, 0.2) };
}

export function withCommit(plan: SimplePlan, commitDiscount: number): SimplePlan {
  return { ...plan, commitDiscount: clamp(Number.isFinite(commitDiscount) ? commitDiscount : 0, 0, 0.95) };
}

export function defaultPlan(dependencies?: EstimateDependencies): SimplePlan {
  return planForPreset(
    {
      cloud: "aws",
      tier: "premium",
      region: referenceRegion.aws,
      monthlySpend: 0,
      mix: { etl: 1, sql: 0, ml: 0 },
      monthlyGrowth: 0.03,
      commitDiscount: 0,
      basket: EMPTY_BASKET,
    },
    "medium",
    dependencies,
  );
}

export function planFromUsage(
  plan: SimplePlan,
  text: string,
  dependencies?: EstimateDependencies,
): { ok: true; plan: SimplePlan } | { ok: false; error: string } {
  const usage = importUsageCsv(text);
  if (!(usage.dbu > 0)) return { ok: false, error: "That file did not contain usage rows." };
  const buckets = bucketDbu(usage);
  const basket = basketForDbu(plan, buckets, dependencies);
  const draft: SimplePlan = {
    ...plan,
    mix: normalizeMix(buckets),
    basket,
    usageDbu: usage.dbu,
    monthlySpend: 0,
  };
  return { ok: true, plan: { ...draft, monthlySpend: projectSimple(draft, dependencies).listMonthly } };
}

export function rollForward(portfolio: Portfolio, result: Estimate, points: ForecastPoint[]) {
  const annual = annualTotal(points);
  const band = uncertaintyBand(annual, portfolio, result);
  const factors = uncertaintyFactors(portfolio, result);
  const months: SimpleMonth[] = points.map((point) => ({
    month: point.month,
    low: roundMoney(point.total * factors.low),
    expected: point.total,
    high: roundMoney(point.total * factors.high),
  }));
  return {
    annual,
    band,
    months,
    spreadPercent: spreadPercent(band),
    listMonthly: listMonthlyOf(result, portfolio.commitment.dbuDiscount),
    cloudShare: result.total > 0 ? result.cloudCost / result.total : 0,
  };
}

export function spreadPercent(band: UncertaintyBand): number {
  if (!(band.expected > 0)) return 0;
  const width = Math.max(band.expected - band.low, band.high - band.expected);
  return Math.round((width / band.expected) * 100);
}

export function listMonthlyOf(result: Estimate, commitDiscount: number): number {
  const keep = 1 - clamp(commitDiscount, 0, 0.95);
  const listDbu = keep > 0 ? result.dbuCost / keep : result.dbuCost;
  return roundMoney(listDbu + result.cloudCost + result.addonCost);
}

export function explain(plan: SimplePlan, result: Estimate, band: UncertaintyBand): string[] {
  const region = regionInfo(plan.cloud, regionFor(plan.cloud, plan.region));
  const mix = normalizeMix(plan.mix);
  const lines = [
    "Pipelines are classic jobs on a standard machine, so part of the bill is the cloud provider. Dashboards are serverless SQL, which has no separate machine charge. Models are token usage priced at the serving rate.",
    `Prices are the public ${plan.tier} list for ${cloudName(plan.cloud)} in ${region.label}.`,
    "Databricks measures usage in DBU. You enter dollars, and this page turns them into that usage with the published rate card.",
  ];
  if (plan.usageDbu) {
    lines.push(
      "The starting point is your usage file. The mix follows the kinds of usage in that file. The file does not list cloud machines, so machine cost is inferred from the pipeline share.",
    );
  } else {
    lines.push(
      `The starting monthly amount is split ${percent(mix.etl)} pipelines, ${percent(mix.sql)} dashboards, and ${percent(mix.ml)} models. Moving the mix keeps that amount and changes what it is made of.`,
    );
  }
  if (plan.commitDiscount > 0) {
    lines.push(
      `The commitment discount of ${percent(plan.commitDiscount)} applies to the Databricks portion only, not to cloud machines.`,
    );
  }
  if (plan.monthlyGrowth > 0) {
    lines.push(`Each month is ${percent(plan.monthlyGrowth)} higher than the month before.`);
  } else {
    lines.push("Growth is flat, so a year with no discount is about twelve times the first month.");
  }
  if (band.calibrated) {
    lines.push(
      "The shaded range is tighter because it starts from a usage file. It is a planning range, not a prediction interval.",
    );
  } else if (result.lines.some((item) => item.approximateVm)) {
    lines.push("The shaded range runs from about 15% under to 28% over, because a machine rate is a stand-in.");
  } else {
    lines.push(
      "The shaded range runs from about 15% under to 20% over. It is a planning range, not a prediction interval.",
    );
  }
  if (plan.cloud === "azure" && plan.tier === "enterprise") {
    lines.push("Azure publishes one plan, so Enterprise uses the same list as Premium.");
  }
  lines.push(
    "Estimates only. A private contract, a promotion, or support charges will differ. The Lakehouse Real-Time promotion is not applied.",
  );
  return lines;
}

function withoutUsage(plan: SimplePlan): SimplePlan {
  const next = { ...plan };
  delete next.usageDbu;
  return next;
}

function snapScale(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function cloudName(cloud: Cloud): string {
  if (cloud === "aws") return "AWS";
  if (cloud === "azure") return "Azure";
  return "Google Cloud";
}

export { annualGrowthFromMonthly };
