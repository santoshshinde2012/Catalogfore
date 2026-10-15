import type { PricingCatalog } from "../catalog/pricing-catalog.js";
import { scaledCount } from "../money.js";
import type { Portfolio, Workload } from "../types.js";
import { clonePortfolio, type ScenarioPolicy } from "./types.js";

function toServerless(
  workload: Extract<Workload, { kind: "cluster" }>,
  cloud: Portfolio["cloud"],
  catalog: PricingCatalog,
): Workload | null {
  if (workload.sku !== "jobs_classic" && !workload.sku.startsWith("dlt_")) return null;
  const instance = catalog.instance(workload.cloud ?? cloud, workload.instanceId);
  if (!instance) return workload;
  const workers = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
  const photon = workload.photon ? catalog.photonMultiplier : 1;
  const dbuPerHour = (1 + workers) * instance.dbuPerHour * photon;
  const sku = workload.sku === "jobs_classic" ? "jobs_serverless" : "dlt_serverless";
  return {
    id: workload.id,
    name: workload.name,
    cloud: workload.cloud,
    region: workload.region,
    tier: workload.tier,
    kind: "serverless_compute",
    sku,
    dbuPerHour,
    schedule: workload.schedule,
  };
}

export const scenarioPolicies: readonly ScenarioPolicy[] = [
  {
    id: "as_modeled",
    name: "As modeled",
    description: "The portfolio exactly as it stands.",
    apply: (portfolio) => clonePortfolio(portfolio),
  },
  {
    id: "jobs_serverless",
    name: "Classic jobs → serverless",
    description:
      "Keeps the same monthly DBUs for classic jobs and pipelines, drops the VM line, and reprices at the serverless rate.",
    apply(portfolio, catalog) {
      const next = clonePortfolio(portfolio);
      next.workloads = next.workloads.map((workload) =>
        workload.kind === "cluster" ? (toServerless(workload, next.cloud, catalog) ?? workload) : workload,
      );
      return next;
    },
  },
  {
    id: "photon_on",
    name: "Photon on",
    description:
      "Turns Photon on for classic clusters at the catalog multiplier. Hours stay the same, so this is the cost if Photon does not shorten the job.",
    apply(portfolio) {
      const next = clonePortfolio(portfolio);
      next.workloads = next.workloads.map((workload) =>
        workload.kind === "cluster" ? { ...workload, photon: true } : workload,
      );
      return next;
    },
  },
  {
    id: "photon_speedup_2",
    name: "Photon on, assume 2× faster",
    description:
      "Photon on, and classic cluster hours cut in half. The speedup is an assumption you must have measured. It is not a Databricks guarantee.",
    apply(portfolio) {
      const next = clonePortfolio(portfolio);
      next.workloads = next.workloads.map((workload) => {
        if (workload.kind !== "cluster") return workload;
        return {
          ...workload,
          photon: true,
          schedule: { ...workload.schedule, hoursPerDay: workload.schedule.hoursPerDay / 2 },
        };
      });
      return next;
    },
  },
  {
    id: "spot_70",
    name: "70% spot workers",
    description:
      "Seventy percent of classic worker hours take the default spot discount. Drivers stay on demand. DBUs do not change.",
    apply(portfolio, catalog) {
      const next = clonePortfolio(portfolio);
      next.workloads = next.workloads.map((workload) =>
        workload.kind === "cluster"
          ? { ...workload, spotShare: 0.7, spotDiscount: catalog.defaultSpotDiscount }
          : workload,
      );
      return next;
    },
  },
  {
    id: "commit_37",
    name: "37% DBU commit",
    description: "The Azure-published ceiling for Databricks Commit Units, applied to the DBU line only.",
    apply(portfolio) {
      const next = clonePortfolio(portfolio);
      next.commitment = { ...next.commitment, dbuDiscount: 0.37 };
      return next;
    },
  },
  {
    id: "commit_37_cloud_30",
    name: "37% DBU + 30% VM commit",
    description: "DBU commit plus a 30% discount on on-demand VM hours. Spot hours are not discounted a second time.",
    apply(portfolio) {
      const next = clonePortfolio(portfolio);
      next.commitment = { dbuDiscount: 0.37, cloudDiscount: 0.3 };
      return next;
    },
  },
];

export function findScenarioPolicy(
  id: string,
  policies: readonly ScenarioPolicy[] = scenarioPolicies,
): ScenarioPolicy | undefined {
  return policies.find((policy) => policy.id === id);
}
