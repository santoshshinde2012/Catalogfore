import azureMetersJson from "../../../data/azure-dbu-meters.json";
import skuRatesJson from "../../../data/sku-rates.json";
import instancesJson from "../../../data/instances.json";
import vmPricesJson from "../../../data/cloud-vm-prices.json";
import type { Cloud, SkuId, SqlSize, Tier } from "./types.js";

export interface RegionInfo {
  cloud: Cloud;
  id: string;
  label: string;
  factor: number;
  source: string;
}

export interface InstanceInfo {
  cloud: Cloud;
  id: string;
  label: string;
  family: string;
  vCPU: number;
  memoryGiB: number;
  dbuPerHour: number;
}

export interface VmPrice {
  cloud: Cloud;
  region: string;
  instanceId: string;
  onDemandHourly: number;
  /** Spot Instance advisor hourly rate, when the public advisor has this instance. */
  spotHourly?: number;
  source: string;
  asOf: string;
}

export interface AzureDbuMeter {
  region: string;
  sku: SkuId;
  usdPerDbu: number;
  meterName: string;
}

export interface SkuCatalog {
  version: string;
  verifiedOn: string;
  disclaimer: string;
  photonMultiplier: number;
  photonMultiplierNote: string;
  sqlVmDollarsPerDbuHour: number;
  sqlVmNote: string;
  commitmentPresets: number[];
  defaultSpotDiscount: number;
  addonRates: { none: number; compliance: number; mission_critical: number };
  azureEnterpriseEqualsPremium: boolean;
  managedStoragePerDsu: Record<Cloud, number>;
  objectStoragePerGbMonth: Record<Cloud, number>;
  defaultEgressPerGb: Record<Cloud, number>;
  lakebase: {
    available: Record<Cloud, boolean>;
    usdPerCuHour: Record<Cloud, number>;
    usdPerGbMonth: Record<Cloud, number>;
    note: string;
  };
  sqlDbuPerHour: Record<SqlSize, number>;
  appsDbuPerHour: { medium: number; large: number };
  aiSearch: Record<"standard" | "storage_optimized", { dbuPerHour: number; storagePerGbMonth: number; freeGb: number }>;
  servingGpuDbuPerHour: { id: string; label: string; dbuPerHour: number }[];
  foundationModels: {
    id: string;
    label: string;
    inputDbuPerMillion: number;
    outputDbuPerMillion: number;
    provisionedDbuPerHour: number;
  }[];
  rates: Record<Cloud, Record<Tier, Record<SkuId, number>>>;
  regions: RegionInfo[];
  skuLabels: Record<SkuId, string>;
  includesCompute: Record<SkuId, boolean>;
}

export const skuCatalog = skuRatesJson as SkuCatalog;
export const instances = instancesJson.instances as InstanceInfo[];
export const vmPrices = vmPricesJson.prices as VmPrice[];
export const referenceRegion = vmPricesJson.referenceRegion as Record<Cloud, string>;
export const azureDbuMeters = azureMetersJson.meters as AzureDbuMeter[];
export const pricesUpdatedOn = [vmPricesJson.updatedOn, azureMetersJson.updatedOn, skuCatalog.verifiedOn]
  .filter((value) => typeof value === "string")
  .sort()
  .at(-1) as string;

const instanceKey = (cloud: Cloud, id: string) => `${cloud}:${id}`;
const instanceMap = new Map(instances.map((row) => [instanceKey(row.cloud, row.id), row]));
const priceMap = new Map(vmPrices.map((row) => [`${row.cloud}:${row.region}:${row.instanceId}`, row]));
const azureRateMap = new Map(azureDbuMeters.map((row) => [`${row.region}:${row.sku}`, row.usdPerDbu]));

export function regionInfo(cloud: Cloud, regionId: string): RegionInfo {
  return (
    skuCatalog.regions.find((region) => region.cloud === cloud && region.id === regionId) ??
    skuCatalog.regions.find((region) => region.cloud === cloud && region.id === referenceRegion[cloud]) ??
    skuCatalog.regions.filter((region) => region.cloud === cloud)[0]
  );
}

export function listRegions(cloud: Cloud): RegionInfo[] {
  return skuCatalog.regions.filter((region) => region.cloud === cloud);
}

export function listInstances(cloud: Cloud): InstanceInfo[] {
  return instances.filter((row) => row.cloud === cloud);
}

export function findInstance(cloud: Cloud, id: string): InstanceInfo | undefined {
  return instanceMap.get(instanceKey(cloud, id));
}

export function defaultInstanceId(cloud: Cloud): string {
  return listInstances(cloud)[0]?.id ?? "";
}

export function vmHourly(
  cloud: Cloud,
  region: string,
  instanceId: string,
): { hourly: number; spotHourly: number | null; approximate: boolean; source: string } {
  const exact = priceMap.get(`${cloud}:${region}:${instanceId}`);
  if (exact) {
    return {
      hourly: exact.onDemandHourly,
      spotHourly: exact.spotHourly ?? null,
      approximate: false,
      source: exact.source,
    };
  }
  const fallbackRegion = referenceRegion[cloud];
  const fallback = priceMap.get(`${cloud}:${fallbackRegion}:${instanceId}`);
  if (fallback) {
    return {
      hourly: fallback.onDemandHourly,
      spotHourly: null,
      approximate: region !== fallbackRegion,
      source: fallback.source,
    };
  }
  return { hourly: 0, spotHourly: null, approximate: true, source: "missing" };
}

/** Azure Retail Prices meter for this region, or null when the curated rate and region factor still apply. */
export function regionalSkuRate(cloud: Cloud, region: string, tier: Tier, sku: SkuId): number | null {
  if (cloud !== "azure") return null;
  if (tier !== "premium" && tier !== "enterprise") return null;
  return azureRateMap.get(`${region}:${sku}`) ?? null;
}

export function skuRate(cloud: Cloud, tier: Tier, sku: SkuId): number {
  return skuCatalog.rates[cloud][tier][sku];
}

export function sqlSizeLabel(size: SqlSize): string {
  const labels: Record<SqlSize, string> = {
    "2xs": "2X-Small",
    xs: "X-Small",
    s: "Small",
    m: "Medium",
    l: "Large",
    xl: "X-Large",
    "2xl": "2X-Large",
    "3xl": "3X-Large",
    "4xl": "4X-Large",
  };
  return labels[size];
}

export const SQL_SIZES: SqlSize[] = ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];
