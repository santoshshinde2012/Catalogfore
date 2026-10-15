import { skuCatalog } from "./catalog.js";
import { hoursPerMonth } from "./money.js";
import type { Estimate, Portfolio, Tip } from "./types.js";

export function tips(portfolio: Portfolio, estimateResult: Estimate): Tip[] {
  const found: Tip[] = [];
  const costOf = (sku: string) =>
    estimateResult.lines.filter((line) => line.sku === sku).reduce((sum, line) => sum + line.total, 0);
  const allPurpose = costOf("all_purpose_classic") + costOf("all_purpose_serverless");
  const jobs = costOf("jobs_classic") + costOf("jobs_serverless");
  if (allPurpose > 0 && allPurpose >= jobs && allPurpose > estimateResult.total * 0.35) {
    found.push({
      id: "all-purpose",
      tone: "warn",
      text: "Interactive compute is a large share of this estimate. Production jobs left on all-purpose clusters are the usual surprise. Move scheduled work to Jobs, where the DBU rate is much lower.",
    });
  }

  for (const workload of portfolio.workloads) {
    if (workload.kind === "sql" && workload.edition !== "serverless") {
      const flat = workload.scale.min === workload.scale.max && workload.schedule.hoursPerDay >= 18;
      if (flat) {
        found.push({
          id: `sql-${workload.id}`,
          tone: "warn",
          text: `${workload.name} stays at full size most of the day. A lower minimum, or serverless SQL, often beats a classic warehouse that never scales in.`,
        });
      }
    }
    if (workload.kind === "cluster" && workload.sku === "all_purpose_classic" && workload.spotShare > 0.4) {
      found.push({
        id: `spot-${workload.id}`,
        tone: "warn",
        text: `${workload.name} puts interactive workers on spot. Evictions interrupt notebooks. Keep spot for restartable jobs.`,
      });
    }
    if (workload.kind === "cluster" && workload.photon && !found.some((tip) => tip.id === "photon")) {
      found.push({
        id: "photon",
        tone: "info",
        text: `${workload.name} includes the ${skuCatalog.photonMultiplier}× Photon DBU multiplier with the schedule you entered. If a measured run is faster, shorten hours or open the “assume 2× faster” scenario. The multiplier alone is not a savings.`,
      });
    }
  }

  if (portfolio.commitment.dbuDiscount >= 0.25 && portfolio.forecast.annualGrowth < 0) {
    found.push({
      id: "commit-decline",
      tone: "warn",
      text: "A large DBU commit combined with a shrinking forecast can cost more than pay-as-you-go, because unused commit is sunk. Compare the 37% scenario against the uncommitted one before treating the discount as savings.",
    });
  }

  if (portfolio.usageScale === 1) {
    found.push({
      id: "calibrate",
      tone: "info",
      text: "This forecast is not calibrated to a bill. Import a system.billing.usage CSV to scale month zero to last month’s DBUs.",
    });
  }

  if (estimateResult.warnings.some((warning) => warning.includes("reference-region"))) {
    found.push({
      id: "vm-approx",
      tone: "info",
      text: "Some VM rates are the reference-region price, not a local tariff. DBU region factors still apply. Refresh cloud prices or override the SQL VM rate before you treat the infra line as final.",
    });
  }

  const longAllPurpose = portfolio.workloads.some(
    (workload) =>
      workload.kind === "cluster" &&
      workload.sku === "all_purpose_classic" &&
      hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek) > 200,
  );
  if (longAllPurpose) {
    found.push({
      id: "autoterm",
      tone: "info",
      text: "An all-purpose cluster scheduled like a long shift is usually idle part of that time. Auto-termination of 10–15 minutes is the first control to check.",
    });
  }

  return found.slice(0, 6);
}
