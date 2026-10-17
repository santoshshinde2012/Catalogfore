import { sourceReference } from "./provenance.js";
import { secondaryDbuSource } from "../catalog/resolve-dbu-rate.js";

export const source = sourceReference;
export const consumptionSource = source(
  "Azure Databricks serverless consumption guide",
  "https://learn.microsoft.com/en-us/azure/databricks/resources/pricing",
  "consumption",
);
export const secondarySource = source(
  secondaryDbuSource.title,
  secondaryDbuSource.url,
  secondaryDbuSource.role,
  secondaryDbuSource.locator,
  secondaryDbuSource.observedOn,
);
export const pricingSource = source("Databricks pricing", "https://www.databricks.com/product/pricing", "context");
