import type { PricingCatalog } from "../catalog/pricing-catalog.js";
import type { Cloud, Portfolio, Tier, Workload } from "../types.js";

export interface Placement {
  cloud: Cloud;
  region: string;
  tier: Tier;
  factor: number;
  regionSource: string;
}

export interface CostContext {
  catalog: PricingCatalog;
  portfolio: Portfolio;
  placement: Placement;
}

export interface RawLine {
  workloadId: string;
  name: string;
  kind: Workload["kind"];
  sku: string;
  hours: number;
  dbu: number;
  dbuCost: number;
  cloudCost: number;
  approximateVm: boolean;
  notes: string[];
}

/** One pricing rule. A new workload kind is a new strategy, not an edit to the estimator. */
export interface CostStrategy {
  readonly kind: Workload["kind"];
  quote(workload: Workload, context: CostContext): RawLine;
}

export class MissingCostStrategyError extends Error {
  readonly kind: string;

  constructor(kind: string) {
    super(`No cost strategy is registered for workload kind "${kind}".`);
    this.name = "MissingCostStrategyError";
    this.kind = kind;
  }
}

export function defineStrategy<K extends Workload["kind"]>(
  kind: K,
  quote: (workload: Extract<Workload, { kind: K }>, context: CostContext) => RawLine,
): CostStrategy {
  return {
    kind,
    quote(workload, context) {
      if (workload.kind !== kind) {
        throw new Error(`Cost strategy "${kind}" cannot price a "${workload.kind}" workload.`);
      }
      return quote(workload as Extract<Workload, { kind: K }>, context);
    },
  };
}
