import type { Cloud, Tier } from "../types.js";
import { AZURE_REFERENCE_COMPONENTS } from "./components.js";

/**
 * Zerobus Ingest, dollars per GB, US East list.
 * The retained Databricks price-card capture verifies these regional GB prices separately from DBU tariffs.
 * Other regions and GCP remain unresolved in this reference template; no regional scaling is inferred.
 */
export const ZEROBUS_USD_PER_GB: Partial<Record<Cloud, Partial<Record<Tier, number>>>> = {
  aws: { premium: 0.05, enterprise: 0.064 },
  azure: { premium: 0.064, enterprise: 0.064 },
};

export const ZEROBUS_REFERENCE_REGIONS: Readonly<Partial<Record<Cloud, string>>> = {
  aws: "us-east-1",
  azure: "eastus",
};

export const ZEROBUS_PRICE_SOURCE = {
  title: "Databricks official Zerobus price card; USD per GB",
  url: "https://www.databricks.com/en-pricing-assets/data/pricing/cards.json",
  observedOn: "2026-10-17",
} as const;

export function zerobusMatchesPlacement(cloud: Cloud, region: string): boolean {
  return ZEROBUS_REFERENCE_REGIONS[cloud] === region;
}

/**
 * Azure Databricks "Data Processed" meter, East US, dollars per GB.
 * Azure Retail Prices API, re-checked 2026-10-17. Still $0.02/GB. Not scaled to other regions. AWS and GCP are unpublished.
 */
export const AZURE_DATA_PROCESSED_USD_PER_GB = AZURE_REFERENCE_COMPONENTS.data_processed.usdPerUnit;

/** Token formulas quote DBU per million tokens. */
export const TOKENS_PER_MILLION = 1_000_000;
