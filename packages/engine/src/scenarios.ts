import { findInstance, skuCatalog } from "./catalog.js";
import { annualTotal, forecast } from "./forecast.js";
import { estimate } from "./estimate.js";
import { clamp, hoursPerMonth, scaledCount } from "./money.js";
import type { Portfolio, ScenarioPresetId, ScenarioResult, Workload } from "./types.js";

export const SCENARIO_PRESETS: { id: ScenarioPresetId; name: string; description: string }[] = [
  { id: "as_modeled", name: "As modeled", description: "The portfolio exactly as it stands." },
  {
    id: "jobs_serverless",
    name: "Classic jobs → serverless",
    description: "Keeps the same monthly DBUs for classic jobs and pipelines, drops the VM line, and reprices at the serverless rate.",
  },
  {
    id: "photon_on",
    name: "Photon on",
    description: "Turns Photon on for classic clusters at the catalog multiplier. Hours stay the same, so this is the cost if Photon does not shorten the job.",
  },
  {
    id: "photon_speedup_2",
    name: "Photon on, assume 2× faster",
    description: "Photon on, and classic cluster hours cut in half. The speedup is an assumption you must have measured. It is not a Databricks guarantee.",
  },
  {
    id: "spot_70",
    name: "70% spot workers",
    description: "Seventy percent of classic worker hours take the default spot discount. Drivers stay on demand. DBUs do not change.",
  },
  {
    id: "commit_37",
    name: "37% DBU commit",
    description: "The Azure-published ceiling for Databricks Commit Units, applied to the DBU line only.",
  },
  {
    id: "commit_37_cloud_30",
    name: "37% DBU + 30% VM commit",
    description: "DBU commit plus a 30% discount on on-demand VM hours. Spot hours are not discounted a second time.",
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toServerless(workload: Extract<Workload, { kind: "cluster" }>, cloud: Portfolio["cloud"]): Workload | null {
  if (workload.sku !== "jobs_classic" && !workload.sku.startsWith("dlt_")) return null;
  const instance = findInstance(workload.cloud ?? cloud, workload.instanceId);
  if (!instance) return workload;
  const workers = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
  const photon = workload.photon ? skuCatalog.photonMultiplier : 1;
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

export function applyScenario(portfolio: Portfolio, preset: ScenarioPresetId): Portfolio {
  const next = clone(portfolio);
  if (preset === "as_modeled") return next;
  if (preset === "jobs_serverless") {
    next.workloads = next.workloads.map((workload) =>
      workload.kind === "cluster" ? (toServerless(workload, next.cloud) ?? workload) : workload,
    );
    return next;
  }
  if (preset === "photon_on" || preset === "photon_speedup_2") {
    const speedup = preset === "photon_speedup_2" ? 2 : 1;
    next.workloads = next.workloads.map((workload) => {
      if (workload.kind !== "cluster") return workload;
      const hoursPerDay = speedup > 1 ? workload.schedule.hoursPerDay / speedup : workload.schedule.hoursPerDay;
      return { ...workload, photon: true, schedule: { ...workload.schedule, hoursPerDay } };
    });
    return next;
  }
  if (preset === "spot_70") {
    next.workloads = next.workloads.map((workload) =>
      workload.kind === "cluster"
        ? { ...workload, spotShare: 0.7, spotDiscount: skuCatalog.defaultSpotDiscount }
        : workload,
    );
    return next;
  }
  if (preset === "commit_37") {
    next.commitment = { ...next.commitment, dbuDiscount: 0.37 };
    return next;
  }
  next.commitment = { dbuDiscount: 0.37, cloudDiscount: 0.3 };
  return next;
}

export function compareScenarios(portfolio: Portfolio, presets: ScenarioPresetId[]): ScenarioResult[] {
  const unique = presets.length ? presets : (["as_modeled", "jobs_serverless", "commit_37"] as ScenarioPresetId[]);
  return unique.map((id) => {
    const meta = SCENARIO_PRESETS.find((row) => row.id === id) ?? SCENARIO_PRESETS[0];
    const patched = applyScenario(portfolio, id);
    const result = estimate(patched);
    const points = forecast(result, patched.forecast);
    return {
      id,
      name: meta.name,
      description: meta.description,
      estimate: result,
      forecast: points,
      annual: annualTotal(points),
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
