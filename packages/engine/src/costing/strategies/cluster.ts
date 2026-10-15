import { clamp, hoursPerMonth, scaledCount } from "../../money.js";
import type { Workload } from "../../types.js";
import { cloudCommit, commitText, countText, factorText, hoursText, priceDbu } from "../support.js";
import { defineStrategy, type CostContext, type RawLine } from "../types.js";

export const clusterStrategy = defineStrategy("cluster", (workload, context): RawLine => {
  const { catalog, portfolio, placement } = context;
  const instance = catalog.instance(placement.cloud, workload.instanceId);
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const workers = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
  const notes: string[] = [];
  if (!instance) {
    notes.push(`Unknown instance ${workload.instanceId} for ${placement.cloud}.`);
    return emptyCluster(workload, hours, notes);
  }
  const photon = workload.photon ? catalog.photonMultiplier : 1;
  const rate = catalog.skuRate(placement.cloud, placement.tier, workload.sku);
  const nodeWord = workers <= 0 ? "node" : "nodes";
  const workerPhrase =
    workers <= 0
      ? "driver only"
      : `${countText(workers)} ${Math.abs(workers - 1) < 0.001 ? "worker" : "workers"} + 1 driver`;
  notes.push(
    `${countText(1 + workers)} ${nodeWord} (${workerPhrase}) × ${instance.dbuPerHour} DBU/h × ${hoursText(hours)} × $${rate}/DBU × ${factorText(placement.factor)}${photon !== 1 ? ` × Photon ${photon}` : ""}.${commitText(portfolio)}`,
  );
  if (workload.photon) {
    notes.push(
      `Photon multiplies DBU emission by ${catalog.photonMultiplier}. Runtime is unchanged unless you shorten the schedule.`,
    );
  }
  const dbu = (1 + workers) * instance.dbuPerHour * photon * hours;
  const vm = catalog.vmHourly(placement.cloud, placement.region, instance.id);
  notes.push(
    `VM $${vm.hourly}/h × ${hoursText(hours)} × ${countText(1 + workers)} ${nodeWord}, before spot and a VM commit.`,
  );
  if (vm.approximate) notes.push(`VM rate uses the reference region (${vm.source}).`);
  const spotShare = clamp(workload.spotShare, 0, 1);
  const spotDiscount = clamp(workload.spotDiscount, 0, 0.95);
  const driverOnDemand = vm.hourly * hours;
  const workerOnDemand = workers * (1 - spotShare) * vm.hourly * hours;
  const workerSpot = workers * spotShare * vm.hourly * (1 - spotDiscount) * hours;
  if (spotShare > 0) {
    notes.push(
      `${Math.round(spotShare * 100)}% of worker hours use a ${Math.round(spotDiscount * 100)}% spot discount. The driver stays on demand. DBUs are not discounted.`,
    );
  }
  if (placement.regionSource.startsWith("proxy")) {
    notes.push("DBU region factor is a proxy from published Lakehouse Real-Time ratios, not a per-SKU tariff.");
  }
  return {
    workloadId: workload.id,
    name: workload.name,
    kind: workload.kind,
    sku: workload.sku,
    hours,
    dbu,
    dbuCost: priceDbu(dbu, context, workload.sku),
    cloudCost: cloudCommit(driverOnDemand + workerOnDemand, workerSpot, portfolio),
    approximateVm: vm.approximate || vm.source === "missing",
    notes,
  };
});

function emptyCluster(workload: Extract<Workload, { kind: "cluster" }>, hours: number, notes: string[]): RawLine {
  return {
    workloadId: workload.id,
    name: workload.name,
    kind: workload.kind,
    sku: workload.sku,
    hours,
    dbu: 0,
    dbuCost: 0,
    cloudCost: 0,
    approximateVm: true,
    notes,
  };
}

export function quoteCluster(workload: Extract<Workload, { kind: "cluster" }>, context: CostContext): RawLine {
  return clusterStrategy.quote(workload, context);
}
