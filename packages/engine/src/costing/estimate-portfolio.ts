import { bundledPricingCatalog, type PricingCatalog } from "../catalog/pricing-catalog.js";
import { roundMoney } from "../money.js";
import type { Estimate, LineItem, Portfolio, Workload } from "../types.js";
import { defaultCostStrategies } from "./strategies/index.js";
import { resolvePlacement } from "./support.js";
import { MissingCostStrategyError, type CostStrategy, type RawLine } from "./types.js";

export interface EstimateDependencies {
  catalog: PricingCatalog;
  strategies: readonly CostStrategy[];
}

export const defaultEstimateDependencies: EstimateDependencies = {
  catalog: bundledPricingCatalog,
  strategies: defaultCostStrategies,
};

function quote(workload: Workload, portfolio: Portfolio, dependencies: EstimateDependencies): RawLine {
  const strategy = dependencies.strategies.find((item) => item.kind === workload.kind);
  if (!strategy) throw new MissingCostStrategyError(workload.kind);
  const placement = resolvePlacement(dependencies.catalog, portfolio, workload);
  return strategy.quote(workload, { catalog: dependencies.catalog, portfolio, placement });
}

function finalize(raw: RawLine, scale: number): LineItem {
  const dbu = raw.dbu * scale;
  const dbuCost = roundMoney(raw.dbuCost * scale);
  const cloudCost = roundMoney(raw.cloudCost * scale);
  return {
    workloadId: raw.workloadId,
    name: raw.name,
    kind: raw.kind,
    sku: raw.sku,
    hours: roundMoney(raw.hours),
    dbu: Math.round(dbu * 1000) / 1000,
    dbuCost,
    cloudCost,
    total: roundMoney(dbuCost + cloudCost),
    approximateVm: raw.approximateVm,
    notes: raw.notes,
  };
}

/**
 * Price every workload in a portfolio.
 * Pass a catalog and a strategy list. The default is the bundled book.
 * This function does not read the network, the clock, or React state.
 */
export function estimate(
  portfolio: Portfolio,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): Estimate {
  const scale = portfolio.usageScale > 0 ? portfolio.usageScale : 1;
  const lines = portfolio.workloads.map((workload) => finalize(quote(workload, portfolio, dependencies), scale));
  const dbu = Math.round(lines.reduce((sum, line) => sum + line.dbu, 0) * 1000) / 1000;
  const dbuCost = roundMoney(lines.reduce((sum, line) => sum + line.dbuCost, 0));
  const cloudCost = roundMoney(lines.reduce((sum, line) => sum + line.cloudCost, 0));
  const addonRate = dependencies.catalog.addonRates[portfolio.addon];
  const addonCost = roundMoney(dbuCost * addonRate);
  const warnings: string[] = [];
  if (scale !== 1) {
    warnings.push(
      `Usage scale ${scale.toFixed(3)} is applied to every line. Cloud dollars scale with DBUs because the usage export has no VM bill.`,
    );
  }
  if (lines.some((line) => line.approximateVm)) {
    warnings.push("At least one VM rate is a reference-region stand-in or a SQL equivalence assumption.");
  }
  if (portfolio.cloud === "azure" && portfolio.tier === "enterprise") {
    warnings.push("Azure publishes one plan. Enterprise here uses the same list rates as Azure Premium.");
  }
  return {
    catalogVersion: dependencies.catalog.version,
    verifiedOn: dependencies.catalog.verifiedOn,
    disclaimer: dependencies.catalog.disclaimer,
    lines,
    dbu,
    dbuCost,
    cloudCost,
    addonCost,
    total: roundMoney(dbuCost + cloudCost + addonCost),
    warnings,
    usageScale: scale,
  };
}
