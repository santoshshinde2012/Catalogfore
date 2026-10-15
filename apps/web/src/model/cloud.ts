import { defaultInstanceId, findInstance, skuCatalog, type Portfolio } from "@dcf/engine";

export function regionHint(source: string): string {
  if (source === "reference") return "Reference region. DBU rates are the catalog list, factor 1.";
  if (source === "proxy") return "This region factor is a proxy. It is not a published tariff for every SKU.";
  return "DBU rates scale by the published Lakehouse Real-Time ratio versus the reference region. That ratio is for one SKU and is applied here as a proxy.";
}

export function moveCloud(portfolio: Portfolio, cloud: Portfolio["cloud"]): Portfolio {
  const regions = skuCatalog.regions.filter((region) => region.cloud === cloud);
  const region = regions.some((item) => item.id === portfolio.region) ? portfolio.region : regions[0].id;
  return {
    ...portfolio,
    cloud,
    region,
    workloads: portfolio.workloads.map((workload) => {
      if (workload.kind !== "cluster" || workload.cloud) return workload;
      if (findInstance(cloud, workload.instanceId)) return workload;
      return { ...workload, instanceId: defaultInstanceId(cloud) };
    }),
  };
}

export function setBudget(portfolio: Portfolio, raw: string): Portfolio {
  if (!raw.trim()) {
    const next = { ...portfolio };
    delete next.budgetAnnual;
    return next;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) return portfolio;
  return { ...portfolio, budgetAnnual: value };
}
