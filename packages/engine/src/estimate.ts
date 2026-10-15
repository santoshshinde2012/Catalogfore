import {
  findInstance,
  regionInfo,
  skuCatalog,
  skuRate,
  vmHourly,
} from "./catalog.js";
import { clamp, hoursPerMonth, roundMoney, scaledCount } from "./money.js";
import type { Cloud, Estimate, LineItem, Portfolio, SkuId, Tier, Workload } from "./types.js";

interface Placement {
  cloud: Cloud;
  region: string;
  tier: Tier;
  factor: number;
  regionSource: string;
}

interface RawLine {
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

function placement(portfolio: Portfolio, workload: Workload): Placement {
  const cloud = workload.cloud ?? portfolio.cloud;
  const region = regionInfo(cloud, workload.region ?? portfolio.region);
  return {
    cloud,
    region: region.id,
    tier: workload.tier ?? portfolio.tier,
    factor: region.factor,
    regionSource: region.source,
  };
}

function discountDbu(amount: number, portfolio: Portfolio): number {
  return amount * (1 - clamp(portfolio.commitment.dbuDiscount, 0, 0.95));
}

function priceDbu(dbu: number, place: Placement, sku: SkuId, portfolio: Portfolio): number {
  return discountDbu(dbu * skuRate(place.cloud, place.tier, sku) * place.factor, portfolio);
}

function cloudCommit(onDemand: number, spot: number, portfolio: Portfolio): number {
  const discount = clamp(portfolio.commitment.cloudDiscount, 0, 0.95);
  return onDemand * (1 - discount) + spot;
}

function clusterLine(workload: Extract<Workload, { kind: "cluster" }>, portfolio: Portfolio): RawLine {
  const place = placement(portfolio, workload);
  const instance = findInstance(place.cloud, workload.instanceId);
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const workers = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
  const notes: string[] = [];
  if (!instance) {
    notes.push(`Unknown instance ${workload.instanceId} for ${place.cloud}.`);
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
  const photon = workload.photon ? skuCatalog.photonMultiplier : 1;
  if (workload.photon) notes.push(`Photon multiplies DBU emission by ${skuCatalog.photonMultiplier}. Runtime is unchanged unless you shorten the schedule.`);
  const dbu = (1 + workers) * instance.dbuPerHour * photon * hours;
  const vm = vmHourly(place.cloud, place.region, instance.id);
  if (vm.approximate) notes.push(`VM rate uses the reference region (${vm.source}).`);
  const spotShare = clamp(workload.spotShare, 0, 1);
  const spotDiscount = clamp(workload.spotDiscount, 0, 0.95);
  const driverOnDemand = vm.hourly * hours;
  const workerOnDemand = workers * (1 - spotShare) * vm.hourly * hours;
  const workerSpot = workers * spotShare * vm.hourly * (1 - spotDiscount) * hours;
  if (spotShare > 0) notes.push(`${Math.round(spotShare * 100)}% of worker hours use a ${Math.round(spotDiscount * 100)}% spot discount. The driver stays on demand. DBUs are not discounted.`);
  if (place.regionSource.startsWith("proxy")) notes.push("DBU region factor is a proxy from published Lakehouse Real-Time ratios, not a per-SKU tariff.");
  return {
    workloadId: workload.id,
    name: workload.name,
    kind: workload.kind,
    sku: workload.sku,
    hours,
    dbu,
    dbuCost: priceDbu(dbu, place, workload.sku, portfolio),
    cloudCost: cloudCommit(driverOnDemand + workerOnDemand, workerSpot, portfolio),
    approximateVm: vm.approximate || vm.source === "missing",
    notes,
  };
}

function lineFor(workload: Workload, portfolio: Portfolio): RawLine {
  const place = placement(portfolio, workload);
  const base = {
    workloadId: workload.id,
    name: workload.name,
    kind: workload.kind,
    approximateVm: false,
    notes: [] as string[],
  };

  switch (workload.kind) {
    case "cluster":
      return clusterLine(workload, portfolio);
    case "serverless_compute": {
      const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
      const dbu = Math.max(0, workload.dbuPerHour) * hours;
      base.notes.push("Serverless rate includes compute. No separate VM line.");
      return { ...base, sku: workload.sku, hours, dbu, dbuCost: priceDbu(dbu, place, workload.sku, portfolio), cloudCost: 0 };
    }
    case "sql": {
      const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
      const clusters = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
      const sku = (`sql_${workload.edition}`) as SkuId;
      const dbu = skuCatalog.sqlDbuPerHour[workload.size] * clusters * hours;
      let cloudCost = 0;
      if (workload.edition !== "serverless") {
        const perDbu = workload.vmPerDbuHour ?? skuCatalog.sqlVmDollarsPerDbuHour;
        cloudCost = cloudCommit(dbu * Math.max(0, perDbu), 0, portfolio);
        base.notes.push(skuCatalog.sqlVmNote);
        base.approximateVm = workload.vmPerDbuHour == null;
      } else {
        base.notes.push("Serverless SQL includes compute in the DBU rate.");
      }
      return { ...base, sku, hours, dbu, dbuCost: priceDbu(dbu, place, sku, portfolio), cloudCost };
    }
    case "model_serving": {
      const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
      const gpu = skuCatalog.servingGpuDbuPerHour.find((row) => row.id === workload.gpuId);
      const dbu =
        workload.mode === "cpu"
          ? Math.max(0, workload.concurrency) * hours
          : (gpu?.dbuPerHour ?? 0) * Math.max(0, workload.replicas) * hours;
      if (workload.mode === "gpu" && !gpu) base.notes.push("Unknown GPU profile.");
      if (workload.mode === "cpu") base.notes.push("CPU serving: 1 concurrent request-hour = 1 DBU.");
      return {
        ...base,
        sku: "model_serving",
        hours,
        dbu,
        dbuCost: priceDbu(dbu, place, "model_serving", portfolio),
        cloudCost: 0,
      };
    }
    case "foundation_model": {
      const model = skuCatalog.foundationModels.find((row) => row.id === workload.modelId);
      const dbu = model
        ? (Math.max(0, workload.inputTokensPerMonth) / 1_000_000) * model.inputDbuPerMillion +
          (Math.max(0, workload.outputTokensPerMonth) / 1_000_000) * model.outputDbuPerMillion +
          Math.max(0, workload.provisionedHoursPerMonth) * model.provisionedDbuPerHour
        : 0;
      if (!model) base.notes.push("Unknown foundation model.");
      else base.notes.push("Token DBUs use the model-serving list rate. Cache reads and regional processing uplifts are not included.");
      return {
        ...base,
        sku: "model_serving",
        hours: workload.provisionedHoursPerMonth,
        dbu,
        dbuCost: priceDbu(dbu, place, "model_serving", portfolio),
        cloudCost: 0,
      };
    }
    case "ai_search": {
      const spec = skuCatalog.aiSearch[workload.variant];
      const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
      const units = Math.max(0, workload.units);
      const dbu = units * spec.dbuPerHour * hours;
      const billableGb = Math.max(0, workload.storageGb - spec.freeGb);
      const cloudCost = billableGb * spec.storagePerGbMonth;
      if (spec.freeGb > 0) base.notes.push(`First ${spec.freeGb} GB of index storage are free on this endpoint.`);
      return { ...base, sku: "ai_search", hours, dbu, dbuCost: priceDbu(dbu, place, "ai_search", portfolio), cloudCost };
    }
    case "app": {
      const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
      const dbu = skuCatalog.appsDbuPerHour[workload.size] * hours;
      base.notes.push("Apps bill interactive-serverless DBUs. Medium is 0.5 DBU/hour, Large is 1.");
      return { ...base, sku: "apps", hours, dbu, dbuCost: priceDbu(dbu, place, "apps", portfolio), cloudCost: 0 };
    }
    case "lakebase": {
      const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
      if (!skuCatalog.lakebase.available[place.cloud]) {
        base.notes.push("Lakebase is not priced on this cloud in the bundled catalog.");
        return { ...base, sku: "lakebase", hours, dbu: 0, dbuCost: 0, cloudCost: 0 };
      }
      const compute = Math.max(0, workload.cu) * hours * skuCatalog.lakebase.usdPerCuHour[place.cloud];
      const storage = Math.max(0, workload.storageGb) * skuCatalog.lakebase.usdPerGbMonth[place.cloud];
      base.notes.push(skuCatalog.lakebase.note);
      return {
        ...base,
        sku: "lakebase",
        hours,
        dbu: 0,
        dbuCost: discountDbu(compute * place.factor, portfolio),
        cloudCost: storage,
      };
    }
    case "storage": {
      const rate = workload.managed
        ? skuCatalog.managedStoragePerDsu[place.cloud]
        : skuCatalog.objectStoragePerGbMonth[place.cloud];
      const cloudCost = Math.max(0, workload.gbMonth) * rate;
      base.notes.push(workload.managed ? "Managed storage, about 1 DSU per GB-month." : "Customer-owned object storage. Not a DSU.");
      return { ...base, sku: workload.managed ? "dsu" : "object_storage", hours: 0, dbu: 0, dbuCost: 0, cloudCost };
    }
    case "egress": {
      const rate = workload.pricePerGb ?? skuCatalog.defaultEgressPerGb[place.cloud];
      base.notes.push("Egress uses a single editable $/GB. Cross-region and cross-AZ tariffs are not itemized.");
      return {
        ...base,
        sku: "egress",
        hours: 0,
        dbu: 0,
        dbuCost: 0,
        cloudCost: Math.max(0, workload.gbMonth) * Math.max(0, rate),
      };
    }
    case "metered": {
      const dbu = Math.max(0, workload.dbuPerMonth);
      return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: priceDbu(dbu, place, workload.sku, portfolio), cloudCost: 0 };
    }
    default: {
      const never: never = workload;
      return never;
    }
  }
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

export function estimate(portfolio: Portfolio): Estimate {
  const scale = portfolio.usageScale > 0 ? portfolio.usageScale : 1;
  const lines = portfolio.workloads.map((workload) => finalize(lineFor(workload, portfolio), scale));
  const dbu = Math.round(lines.reduce((sum, line) => sum + line.dbu, 0) * 1000) / 1000;
  const dbuCost = roundMoney(lines.reduce((sum, line) => sum + line.dbuCost, 0));
  const cloudCost = roundMoney(lines.reduce((sum, line) => sum + line.cloudCost, 0));
  const addonCost = roundMoney(dbuCost * skuCatalog.addonRates[portfolio.addon]);
  const warnings: string[] = [];
  if (scale !== 1) warnings.push(`Usage scale ${scale.toFixed(3)} is applied to every line. Cloud dollars scale with DBUs because the usage export has no VM bill.`);
  if (lines.some((line) => line.approximateVm)) warnings.push("At least one VM rate is a reference-region stand-in or a SQL equivalence assumption.");
  if (portfolio.cloud === "azure" && portfolio.tier === "enterprise") {
    warnings.push("Azure publishes one plan. Enterprise here uses the same list rates as Azure Premium.");
  }
  return {
    catalogVersion: skuCatalog.version,
    verifiedOn: skuCatalog.verifiedOn,
    disclaimer: skuCatalog.disclaimer,
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
