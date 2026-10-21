import document from "../../../../../data/databricks-dbu-rates.json";

/** Sole importer of the validated first-party Databricks USD/DBU snapshot. */
export const publishedDbuRates = document.rates;
export const publishedDbuSources = document.sources;
export const publishedDbuIssues = document.issues;
