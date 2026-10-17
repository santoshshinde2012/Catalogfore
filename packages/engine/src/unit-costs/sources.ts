import { sourceReference } from "./provenance.js";

export const source = sourceReference;
export const consumptionSource = source(
  "Azure Databricks serverless consumption guide",
  "https://learn.microsoft.com/en-us/azure/databricks/resources/pricing",
  "consumption",
);
export const secondarySource = source(
  "Curated secondary US East price reference; see research methodology",
  "https://www.flexera.com/blog/finops/databricks-pricing-guide/",
  "price",
  undefined,
  "2026-10-15",
);
export const pricingSource = source("Databricks pricing", "https://www.databricks.com/product/pricing", "context");
