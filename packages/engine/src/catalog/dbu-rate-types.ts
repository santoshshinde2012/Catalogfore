import type { Cloud, SkuId, Tier } from "../types.js";

export interface AzureDbuMeter {
  region: string;
  sku: SkuId;
  usdPerDbu: number;
  meterName: string;
  asOf?: string;
  meterId?: string;
  effectiveStartDate?: string;
  unitOfMeasure?: string;
  sourceUrl?: string;
  isPrimaryMeterRegion?: boolean;
}

export interface DbuRateObservation {
  cloud: Cloud;
  region: string | null;
  tier: Tier;
  sku: SkuId;
  usdPerDbu: number;
  sourceUrl: string;
  title: string;
  locator: string;
  observedOn: string | null;
  effectiveFrom: string | null;
  unitOfMeasure: string;
}

export interface DbuRateConflict {
  cloud: Cloud;
  region: string | null;
  tier: Tier;
  sku: SkuId;
  reason: string;
  values: number[];
  sources: { title: string; url: string; observedOn: string | null; locator: string }[];
}

export interface PublishedRateIssue {
  cloud: string;
  region: string | null;
  tier: string | null;
  sku: string | null;
  reason: string;
  sourceId: string;
  sourceIds?: string[];
  sourceValues?: number[];
  sourceRowIndexes: number[];
  sources?: { sourceId: string; usdPerUnit: number; sourcePointer?: string; sourceRowIndex: number }[];
}
