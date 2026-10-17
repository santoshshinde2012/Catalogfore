import {
  findInstance,
  regionInfo,
  skuCatalog,
  regionalSkuRate,
  skuRate,
  firstPartyDbuRate,
  firstPartyBaseDbuRate,
  firstPartyDbuConflict,
  vmHourly,
  referenceRegion,
  type InstanceInfo,
  type RegionInfo,
  type SkuCatalog,
  type DbuRateObservation,
  type DbuRateConflict,
} from "../catalog.js";
import type { Cloud, ClusterSku, SkuId, Tier } from "../types.js";
import { publishedPhotonMultiplier } from "../rates/photon.js";
import { secondaryReferenceDbuRate } from "./reference-dbu.js";

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
  photonMultiplierFor?(cloud: Cloud, sku: ClusterSku): number;
  readonly sqlVmDollarsPerDbuHour: number;
  readonly sqlVmNote: string;
  readonly defaultSpotDiscount: number;
  readonly referenceRegion?: Readonly<Record<Cloud, string>>;
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
  firstPartyDbuRate?(cloud: Cloud, region: string | null, tier: Tier, sku: SkuId): DbuRateObservation | null;
  firstPartyBaseDbuRate?(cloud: Cloud, tier: Tier, sku: SkuId): DbuRateObservation | null;
  referenceDbuRate?(cloud: Cloud, tier: Tier, sku: SkuId): DbuRateObservation | null;
  firstPartyDbuConflict?(cloud: Cloud, region: string | null, tier: Tier, sku: SkuId): DbuRateConflict | null;
  region(cloud: Cloud, regionId: string): RegionInfo;
  instance(cloud: Cloud, id: string): InstanceInfo | undefined;
  vmHourly(cloud: Cloud, region: string, instanceId: string): VmQuote;
}

export const bundledPricingCatalog: PricingCatalog = {
  version: skuCatalog.version,
  verifiedOn: skuCatalog.verifiedOn,
  disclaimer: skuCatalog.disclaimer,
  photonMultiplier: skuCatalog.photonMultiplier,
  photonMultiplierFor: publishedPhotonMultiplier,
  sqlVmDollarsPerDbuHour: skuCatalog.sqlVmDollarsPerDbuHour,
  sqlVmNote: skuCatalog.sqlVmNote,
  defaultSpotDiscount: skuCatalog.defaultSpotDiscount,
  referenceRegion,
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
  firstPartyDbuRate,
  firstPartyBaseDbuRate,
  referenceDbuRate: secondaryReferenceDbuRate,
  firstPartyDbuConflict,
  region: regionInfo,
  instance: findInstance,
  vmHourly,
};
