import type { PricingCatalog } from "../catalog/pricing-catalog.js";
import type { Portfolio, ScenarioPresetId } from "../types.js";

/** A named mutation of a portfolio. The comparer does not know how each policy works. */
export interface ScenarioPolicy {
  readonly id: ScenarioPresetId;
  readonly name: string;
  readonly description: string;
  apply(portfolio: Portfolio, catalog: PricingCatalog): Portfolio;
}

export class UnknownScenarioError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`No scenario policy is registered for "${id}".`);
    this.name = "UnknownScenarioError";
    this.id = id;
  }
}

export function clonePortfolio<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
