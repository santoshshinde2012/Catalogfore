import { bundledPricingCatalog, type PricingCatalog } from "./catalog/pricing-catalog.js";
import { projectPortfolio } from "./projection.js";
import { hoursPerMonth, scaledCount, clamp } from "./money.js";
import { findScenarioPolicy, scenarioPolicies } from "./policies/scenario-policies.js";
import { UnknownScenarioError, type ScenarioPolicy } from "./policies/types.js";
import type { Portfolio, ScenarioPresetId, ScenarioResult } from "./types.js";

export const SCENARIO_PRESETS: { id: ScenarioPresetId; name: string; description: string }[] = scenarioPolicies.map(
  (policy) => ({
    id: policy.id,
    name: policy.name,
    description: policy.description,
  }),
);

export function applyScenario(
  portfolio: Portfolio,
  preset: ScenarioPresetId,
  catalog: PricingCatalog = bundledPricingCatalog,
  policies: readonly ScenarioPolicy[] = scenarioPolicies,
): Portfolio {
  const policy = findScenarioPolicy(preset, policies);
  if (!policy) throw new UnknownScenarioError(preset);
  return policy.apply(portfolio, catalog);
}

export function compareScenarios(portfolio: Portfolio, presets: ScenarioPresetId[]): ScenarioResult[] {
  const unique = presets.length ? presets : (["as_modeled", "jobs_serverless", "commit_37"] as ScenarioPresetId[]);
  return unique.map((id) => {
    const meta = SCENARIO_PRESETS.find((row) => row.id === id) ?? SCENARIO_PRESETS[0];
    const patched = applyScenario(portfolio, id);
    const projected = projectPortfolio(patched);
    const result = projected.estimate;
    const points = projected.points;
    return {
      id,
      name: meta.name,
      description: meta.description,
      estimate: result,
      forecast: points,
      annual: projected.annual,
    };
  });
}

export function classicClusterHours(portfolio: Portfolio): number {
  return portfolio.workloads.reduce((sum, workload) => {
    if (workload.kind !== "cluster") return sum;
    const workers = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
    return sum + hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek) * (1 + workers);
  }, 0);
}

export function clampCommitment(value: number): number {
  return clamp(value, 0, 0.95);
}
