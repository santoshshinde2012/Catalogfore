import { skuCatalog } from "./catalog.js";
import { estimate } from "./estimate.js";
import { annualTotal, forecast } from "./forecast.js";
import { roundMoney } from "./money.js";
import { applyScenario } from "./scenarios.js";
import type { Estimate, Portfolio, Workload } from "./types.js";

export type RecommendationId =
  | "jobs_serverless"
  | "photon_speedup_2"
  | "spot_70"
  | "commit_37"
  | "commit_37_cloud_30"
  | "autostop_notebooks"
  | "autostop_sql"
  | "rightsize";

export interface Recommendation {
  id: RecommendationId;
  title: string;
  detail: string;
  /** Dollars saved over the first 12 forecast months, after growth and seasonality. */
  annualSavings: number;
}

export interface UncertaintyBand {
  low: number;
  expected: number;
  high: number;
  calibrated: boolean;
  reasons: string[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function annualCost(portfolio: Portfolio): number {
  const result = estimate(portfolio);
  return annualTotal(forecast(result, portfolio.forecast));
}

function isJobOrPipeline(workload: Workload): boolean {
  return workload.kind === "cluster" && workload.sku !== "all_purpose_classic";
}

function patchWorkloads(portfolio: Portfolio, map: (workload: Workload) => Workload): Portfolio {
  const next = clone(portfolio);
  next.workloads = next.workloads.map(map);
  return next;
}

export function applyRecommendation(portfolio: Portfolio, id: RecommendationId): Portfolio {
  if (id === "jobs_serverless") return applyScenario(portfolio, "jobs_serverless");
  if (id === "commit_37") return applyScenario(portfolio, "commit_37");
  if (id === "commit_37_cloud_30") return applyScenario(portfolio, "commit_37_cloud_30");
  if (id === "photon_speedup_2") {
    return patchWorkloads(portfolio, (workload) => {
      if (workload.kind !== "cluster" || workload.photon) return workload;
      return {
        ...workload,
        photon: true,
        schedule: { ...workload.schedule, hoursPerDay: workload.schedule.hoursPerDay / 2 },
      };
    });
  }
  if (id === "spot_70") {
    return patchWorkloads(portfolio, (workload) => {
      if (!isJobOrPipeline(workload) || workload.kind !== "cluster") return workload;
      return { ...workload, spotShare: 0.7, spotDiscount: skuCatalog.defaultSpotDiscount };
    });
  }
  if (id === "autostop_notebooks") {
    return patchWorkloads(portfolio, (workload) => {
      const interactive =
        (workload.kind === "cluster" && workload.sku === "all_purpose_classic") ||
        (workload.kind === "serverless_compute" && workload.sku === "all_purpose_serverless");
      if (!interactive || workload.schedule.hoursPerDay <= 8) return workload;
      return { ...workload, schedule: { ...workload.schedule, hoursPerDay: 8 } };
    });
  }
  if (id === "autostop_sql") {
    return patchWorkloads(portfolio, (workload) => {
      if (workload.kind !== "sql") return workload;
      const cutoff = workload.edition === "serverless" ? 20 : 16;
      if (workload.schedule.hoursPerDay < cutoff) return workload;
      return { ...workload, schedule: { ...workload.schedule, hoursPerDay: 10 } };
    });
  }
  return patchWorkloads(portfolio, (workload) => {
    if (workload.kind !== "cluster") return workload;
    const { min, max, utilization } = workload.scale;
    if (min === max && min >= 3) {
      return { ...workload, scale: { ...workload.scale, min: min - 1, max: max - 1 } };
    }
    if (min >= 2 && utilization <= 0.45 && max >= min + 1) {
      return { ...workload, scale: { ...workload.scale, min: Math.max(1, Math.floor(min / 2)) } };
    }
    return workload;
  });
}

const CANDIDATES: {
  id: RecommendationId;
  title: string;
  detail: string;
  when: (portfolio: Portfolio) => boolean;
}[] = [
  {
    id: "jobs_serverless",
    title: "Move classic jobs to serverless",
    detail:
      "Keeps the same monthly DBUs for classic jobs and pipelines, drops the VM line, and uses the serverless rate. Notebooks stay as they are. Serverless includes compute. Storage and egress do not.",
    when: (portfolio) => portfolio.workloads.some((workload) => isJobOrPipeline(workload)),
  },
  {
    id: "photon_speedup_2",
    title: "Assume Photon finishes in half the time",
    detail:
      "Turns Photon on and cuts those clusters’ hours in half. The 2× speedup is an assumption you have to measure, not a Databricks guarantee. DBU emission still uses the catalog Photon multiplier. Apply it only if you have timed the job.",
    when: (portfolio) => portfolio.workloads.some((workload) => workload.kind === "cluster" && !workload.photon),
  },
  {
    id: "spot_70",
    title: "Run job workers on spot",
    detail:
      "Puts 70% of job and pipeline workers on spot at the default discount. Drivers stay on demand. Notebooks stay on demand so a preemption does not kill a session. DBUs do not change.",
    when: (portfolio) =>
      portfolio.workloads.some(
        (workload) => isJobOrPipeline(workload) && workload.kind === "cluster" && workload.spotShare < 0.7,
      ),
  },
  {
    id: "autostop_notebooks",
    title: "Auto-stop notebooks after 8 hours",
    detail:
      "Sets interactive clusters scheduled past 8 hours a day back to 8. The hours you typed are treated as billed time, so this only saves money if auto-stop actually ends the shift.",
    when: (portfolio) =>
      portfolio.workloads.some(
        (workload) =>
          ((workload.kind === "cluster" && workload.sku === "all_purpose_classic") ||
            (workload.kind === "serverless_compute" && workload.sku === "all_purpose_serverless")) &&
          workload.schedule.hoursPerDay > 8,
      ),
  },
  {
    id: "autostop_sql",
    title: "Stop the warehouse overnight",
    detail:
      "Cuts warehouses that are pinned through the night back to a 10-hour day. Skip this if dashboards need the warehouse up.",
    when: (portfolio) =>
      portfolio.workloads.some((workload) => {
        if (workload.kind !== "sql") return false;
        const cutoff = workload.edition === "serverless" ? 20 : 16;
        return workload.schedule.hoursPerDay >= cutoff;
      }),
  },
  {
    id: "rightsize",
    title: "Drop a node and re-time the job",
    detail:
      "Removes one node from each fixed cluster of 3 or more, and lowers a high minimum when utilization is already under 45%. Re-time the job before you drop another. This is a sizing assumption, not a measured result.",
    when: (portfolio) =>
      portfolio.workloads.some((workload) => {
        if (workload.kind !== "cluster") return false;
        const { min, max, utilization } = workload.scale;
        return (min === max && min >= 3) || (min >= 2 && utilization <= 0.45 && max >= min + 1);
      }),
  },
  {
    id: "commit_37",
    title: "Ask for a 37% DBU commit",
    detail:
      "Applies a 37% discount to the DBU line only. That is the published Azure commit-unit ceiling, used here as a what-if, not a price you have been offered.",
    when: (portfolio) => portfolio.commitment.dbuDiscount < 0.37,
  },
  {
    id: "commit_37_cloud_30",
    title: "DBU commit plus 30% off VMs",
    detail:
      "37% off DBUs and 30% off on-demand VM hours. Spot hours are not discounted a second time. Both numbers are planning assumptions until procurement writes them down.",
    when: (portfolio) => portfolio.commitment.dbuDiscount < 0.37 || portfolio.commitment.cloudDiscount < 0.3,
  },
];

export function recommendations(portfolio: Portfolio): Recommendation[] {
  const baseline = annualCost(portfolio);
  const found: Recommendation[] = [];
  for (const candidate of CANDIDATES) {
    if (!candidate.when(portfolio)) continue;
    const patched = applyRecommendation(portfolio, candidate.id);
    const savings = roundMoney(baseline - annualCost(patched));
    if (savings < 1) continue;
    found.push({ id: candidate.id, title: candidate.title, detail: candidate.detail, annualSavings: savings });
  }
  found.sort((a, b) => b.annualSavings - a.annualSavings || a.title.localeCompare(b.title));
  return found.slice(0, 6);
}

export function uncertaintyFactors(
  portfolio: Portfolio,
  result: Estimate,
): { low: number; high: number; calibrated: boolean; reasons: string[] } {
  const calibrated = Math.abs(portfolio.usageScale - 1) > 0.0001 || portfolio.usageCalibrated === true;
  const approximateVm = result.lines.some((line) => line.approximateVm);
  const low = calibrated ? 0.95 : 0.85;
  let high = calibrated ? 1.06 : 1.2;
  const reasons: string[] = [];
  if (calibrated) {
    reasons.push(
      "Month-zero DBUs are scaled to an imported usage file, so this band is tighter. Virtual machines still move with that factor because the usage table has no VM bill.",
    );
  } else {
    reasons.push("No usage file yet. Treat this as about 15% under to 20% over the point estimate.");
  }
  if (!calibrated && approximateVm) {
    high = 1.28;
    reasons.push(
      "A VM line is a reference-region stand-in or the SQL warehouse equivalence. The high side is wider until you replace that rate.",
    );
  }
  return { low, high, calibrated, reasons };
}

export function uncertaintyBand(amount: number, portfolio: Portfolio, result: Estimate): UncertaintyBand {
  const safe = Number.isFinite(amount) ? amount : 0;
  const factors = uncertaintyFactors(portfolio, result);
  return {
    low: roundMoney(safe * factors.low),
    expected: roundMoney(safe),
    high: roundMoney(safe * factors.high),
    calibrated: factors.calibrated,
    reasons: factors.reasons,
  };
}
