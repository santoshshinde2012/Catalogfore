import {
  DATABRICKS_SOURCES,
  COMPUTE_SKUS,
  CARD_SKUS,
  knownCalculatorRegions,
  calculatorRegion,
} from "./databricks-rate-mapping.mjs";

const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const capturePath = (id) => `data/sources/${id}.json.gz`;

/** Offline structural checks complement replay against retained first-party response bytes. */
export function validateDatabricksSnapshot(snapshot) {
  const errors = [];
  if (snapshot?.schemaVersion !== 1 || !validDate(snapshot.observedOn))
    errors.push("Invalid schemaVersion or observation date");
  if (
    !Array.isArray(snapshot?.sources) ||
    !Array.isArray(snapshot?.rates) ||
    !Array.isArray(snapshot?.issues) ||
    !Array.isArray(snapshot?.exclusions)
  )
    return [...errors, "Snapshot arrays are missing"];
  const sourceMap = new Map();
  for (const source of snapshot.sources) {
    const expected = DATABRICKS_SOURCES.find((item) => item.id === source.id);
    if (!expected || sourceMap.has(source.id) || source.url !== expected.url || source.cloud !== expected.cloud)
      errors.push(`Unexpected or duplicate source: ${source.id}`);
    if (
      !/^[a-f0-9]{64}$/.test(source.sha256 ?? "") ||
      !Number.isInteger(source.bytes) ||
      source.bytes <= 0 ||
      !Number.isInteger(source.rowCount) ||
      source.rowCount <= 0 ||
      !validDate(source.observedOn) ||
      source.observedOn > snapshot.observedOn ||
      source.capturePath !== capturePath(source.id)
    )
      errors.push(`Invalid capture fingerprint or date: ${source.id}`);
    sourceMap.set(source.id, source);
  }
  if (sourceMap.size !== DATABRICKS_SOURCES.length) errors.push("Expected both first-party cloud captures");
  const keys = new Set();
  const knownSkus = new Set([...COMPUTE_SKUS.values(), ...CARD_SKUS.values()]);
  for (const rate of snapshot.rates) {
    const key = [rate.cloud, rate.region ?? "_", rate.tier, rate.sku].join(":");
    const source = sourceMap.get(rate.sourceId);
    if (keys.has(key)) errors.push(`Duplicate rate: ${key}`);
    keys.add(key);
    if (
      !["aws", "gcp"].includes(rate.cloud) ||
      !["premium", "enterprise"].includes(rate.tier) ||
      !knownSkus.has(rate.sku) ||
      (rate.region !== null && !knownCalculatorRegions(rate.cloud).has(rate.region))
    )
      errors.push(`Unknown rate dimensions: ${key}`);
    if (
      rate.currency !== "USD" ||
      rate.unit !== "DBU" ||
      !Number.isFinite(rate.usdPerUnit) ||
      rate.usdPerUnit <= 0 ||
      rate.usdPerUnit > 10 ||
      rate.effectiveFrom !== null ||
      rate.effectiveTo !== null
    )
      errors.push(`Invalid monetary unit, rate, or inferred effective interval: ${key}`);
    if (
      !source ||
      (source.cloud !== "multi" && source.cloud !== rate.cloud) ||
      rate.observedOn !== source.observedOn ||
      !Number.isInteger(rate.sourceRowIndex) ||
      rate.sourceRowIndex < 0 ||
      rate.sourceRowIndex >= source.rowCount ||
      !Number.isInteger(rate.matchedRows) ||
      rate.matchedRows <= 0 ||
      rate.matchedRows > source.rowCount ||
      (rate.sourceId === "databricks-price-cards" ? CARD_SKUS : COMPUTE_SKUS).get(rate.sourceCompute) !== rate.sku ||
      calculatorSourceRegion(rate) !== rate.region
    )
      errors.push(`Invalid source locator: ${key}`);
    if (rate.sourceId === "databricks-price-cards") {
      const escape = (value) => value.replaceAll("~", "~0").replaceAll("/", "~1");
      const pointer = `/${rate.tier}/${rate.cloud === "aws" ? "AWS" : "GCP"}/${escape(rate.sourceCompute)}/${escape(rate.sourceRegion ?? "")}`;
      if (rate.sourcePointer !== pointer) errors.push(`Invalid price-card JSON pointer: ${key}`);
    }
  }
  if (!snapshot.rates.length) errors.push("No official DBU rates");
  return errors;
}

function calculatorSourceRegion(rate) {
  return rate.sourceRegion === null || rate.sourceRegion === "n/a"
    ? null
    : calculatorRegion(rate.cloud, rate.sourceRegion);
}
