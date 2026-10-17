import type { Cloud, Tier } from "../types.js";

/**
 * Zerobus Ingest, dollars per GB, US East list.
 * Flexera 2026 guide: AWS Premium $0.050, AWS Enterprise $0.064, Azure Premium $0.064.
 * SunnyData re-checked AWS Enterprise us-east at $0.064/GB on 2026-08-04 and notes that the rate includes compute.
 * GCP is not generally available. First-party docs name a DBU SKU and do not print this dollar rate.
 * See docs/RESEARCH.md. The rate is not multiplied by a region factor.
 */
export const ZEROBUS_USD_PER_GB: Partial<Record<Cloud, Partial<Record<Tier, number>>>> = {
  aws: { premium: 0.05, enterprise: 0.064 },
  azure: { premium: 0.064, enterprise: 0.064 },
};

/**
 * Azure Databricks "Data Processed" meter, East US, dollars per GB.
 * Azure Retail Prices API, fetched 2026-10-16. Not scaled to other regions. AWS and GCP are unpublished.
 */
export const AZURE_DATA_PROCESSED_USD_PER_GB = 0.02;

/** Token formulas quote DBU per million tokens. */
export const TOKENS_PER_MILLION = 1_000_000;
