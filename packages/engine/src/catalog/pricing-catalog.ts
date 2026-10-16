import {
  findInstance,
  regionInfo,
  skuCatalog,
  regionalSkuRate,
  skuRate,
  vmHourly,
  type InstanceInfo,
  type RegionInfo,
  type SkuCatalog,
} from "../catalog.js";
import type { Cloud, SkuId, Tier } from "../types.js";

export interface VmQuote {
  hourly: number;
  spotHourly: number | null;
  approximate: boolean;
  source: string;
}

/** Read-only price book. Strategies depend on this, not on the JSON files. */
export interface PricingCatalog {
  readonly version: string;
  readonly verifiedOn: string;
  readonly disclaimer: string;
  readonly photonMultiplier: number;
  readonly sqlVmDollarsPerDbuHour: number;
  readonly sqlVmNote: string;
  readonly defaultSpotDiscount: number;
  readonly addonRates: SkuCatalog["addonRates"];
  readonly sqlDbuPerHour: SkuCatalog["sqlDbuPerHour"];
  readonly appsDbuPerHour: SkuCatalog["appsDbuPerHour"];
  readonly aiSearch: SkuCatalog["aiSearch"];
  readonly servingGpuDbuPerHour: SkuCatalog["servingGpuDbuPerHour"];
  readonly foundationModels: SkuCatalog["foundationModels"];
  readonly lakebase: SkuCatalog["lakebase"];
  readonly managedStoragePerDsu: SkuCatalog["managedStoragePerDsu"];
  readonly objectStoragePerGbMonth: SkuCatalog["objectStoragePerGbMonth"];
  readonly defaultEgressPerGb: SkuCatalog["defaultEgressPerGb"];
  skuRate(cloud: Cloud, tier: Tier, sku: SkuId): number;
  regionalSkuRate?(cloud: Cloud, region: string, tier: Tier, sku: SkuId): number | null;
  region(cloud: Cloud, regionId: string): RegionInfo;
  instance(cloud: Cloud, id: string): InstanceInfo | undefined;
  vmHourly(cloud: Cloud, region: string, instanceId: string): VmQuote;
}

export const bundledPricingCatalog: PricingCatalog = {
  version: skuCatalog.version,
  verifiedOn: skuCatalog.verifiedOn,
  disclaimer: skuCatalog.disclaimer,
  photonMultiplier: skuCatalog.photonMultiplier,
  sqlVmDollarsPerDbuHour: skuCatalog.sqlVmDollarsPerDbuHour,
  sqlVmNote: skuCatalog.sqlVmNote,
  defaultSpotDiscount: skuCatalog.defaultSpotDiscount,
  addonRates: skuCatalog.addonRates,
  sqlDbuPerHour: skuCatalog.sqlDbuPerHour,
  appsDbuPerHour: skuCatalog.appsDbuPerHour,
  aiSearch: skuCatalog.aiSearch,
  servingGpuDbuPerHour: skuCatalog.servingGpuDbuPerHour,
  foundationModels: skuCatalog.foundationModels,
  lakebase: skuCatalog.lakebase,
  managedStoragePerDsu: skuCatalog.managedStoragePerDsu,
  objectStoragePerGbMonth: skuCatalog.objectStoragePerGbMonth,
  defaultEgressPerGb: skuCatalog.defaultEgressPerGb,
  skuRate,
  regionalSkuRate,
  region: regionInfo,
  instance: findInstance,
  vmHourly,
};
