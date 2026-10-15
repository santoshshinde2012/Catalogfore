import { describe, expect, it } from "vitest";
import { bundledPricingCatalog } from "../catalog/pricing-catalog.js";
import { blankPortfolio } from "../portfolio.js";
import type { Portfolio, Workload } from "../types.js";
import { scenarioPolicies } from "./scenario-policies.js";
import { UnknownScenarioError } from "./types.js";
import { applyScenario } from "../scenarios.js";

function job(): Portfolio {
  const portfolio = blankPortfolio();
  const workload: Workload = {
    id: "job",
    name: "Nightly",
    kind: "cluster",
    sku: "jobs_classic",
    instanceId: "m5.xlarge",
    scale: { min: 2, max: 2, utilization: 1 },
    photon: false,
    spotShare: 0,
    spotDiscount: 0.6,
    schedule: { hoursPerDay: 8, daysPerWeek: 5 },
  };
  portfolio.workloads = [workload];
  return portfolio;
}

describe("scenario policies", () => {
  it("registers every preset id exactly once", () => {
    const ids = scenarioPolicies.map((policy) => policy.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("jobs_serverless");
    expect(ids).toContain("commit_37_cloud_30");
  });

  it("converts classic jobs through the policy and leaves the catalog rate to the strategy", () => {
    const converted = applyScenario(job(), "jobs_serverless");
    expect(converted.workloads[0].kind).toBe("serverless_compute");
    const spot = applyScenario(job(), "spot_70");
    const cluster = spot.workloads[0];
    expect(cluster.kind === "cluster" && cluster.spotShare).toBe(0.7);
    expect(cluster.kind === "cluster" && cluster.spotDiscount).toBe(bundledPricingCatalog.defaultSpotDiscount);
  });

  it("rejects an id that is not in the supplied policy list", () => {
    expect(() => applyScenario(job(), "commit_37", bundledPricingCatalog, [])).toThrow(UnknownScenarioError);
  });
});
