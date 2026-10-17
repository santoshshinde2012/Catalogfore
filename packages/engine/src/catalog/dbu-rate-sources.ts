import type { DbuRateSource } from "./resolve-dbu-rate.js";

export const secondaryDbuSource: Readonly<DbuRateSource> = {
  title: "Curated secondary US East price reference; see research methodology",
  url: "https://www.flexera.com/blog/finops/databricks-pricing-guide/",
  role: "price",
  observedOn: "2026-10-15",
};

export const regionalProxySource: Readonly<DbuRateSource> = {
  title: "Lakehouse Real-Time regional ratio used as a planning proxy",
  url: "https://docs.databricks.com/aws/en/compute/sql-warehouse/real-time-pricing",
  role: "region",
  observedOn: null,
};
