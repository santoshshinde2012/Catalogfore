import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { COMPUTE_SKUS, calculatorRegion, exclusionReason } from "./databricks-rate-mapping.mjs";

/** Preserve row locators and quarantines: a first-party host alone does not prove unit semantics. */
export function parseDatabricksRates(text, source, observedOn) {
  const input = JSON.parse(text);
  if (!Array.isArray(input) || input.length === 0)
    throw new Error(`${source.id}: expected a nonempty calculator array`);
  const groups = new Map();
  const exclusions = new Map();
  const issues = [];
  const issue = (row, index, reason, sku = null, region = null) =>
    issues.push({
      id: `${source.id}:${index}:${reason}`,
      cloud: source.cloud,
      region,
      tier: row.plan === "Premium" ? "premium" : row.plan === "Enterprise" ? "enterprise" : null,
      sku,
      reason,
      sourceId: source.id,
      sourceRowIndexes: [index],
    });
  input.forEach((row, index) => {
    if (!row || typeof row !== "object" || row.cloud !== source.label) {
      issue(row ?? {}, index, "unexpected-cloud-or-row-shape");
      return;
    }
    const sku = COMPUTE_SKUS.get(row.compute);
    if (!sku) {
      const reason = exclusionReason(row.compute);
      exclusions.set(reason, (exclusions.get(reason) ?? 0) + 1);
      return;
    }
    const region = calculatorRegion(source.cloud, row.region);
    if (region === undefined) {
      issue(row, index, "unmapped-region-label", sku);
      return;
    }
    if (!["Premium", "Enterprise"].includes(row.plan)) {
      issue(row, index, "unsupported-plan", sku, region);
      return;
    }
    const value = typeof row.baserate === "string" && /^\d+(?:\.\d+)?$/.test(row.baserate) ? Number(row.baserate) : NaN;
    const labelPrice =
      typeof row.compute_label === "string" ? row.compute_label.match(/\(\$(\d+(?:\.\d+)?)\/DBU\)/) : null;
    const sqlHours =
      row.compute.startsWith("SQL ") &&
      Number(row.dburate) > 0 &&
      Math.abs(Number(row.hourrate) - value * Number(row.dburate)) <= 0.00011;
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 10 ||
      (!sqlHours && (!labelPrice || Number(labelPrice[1]) !== value))
    ) {
      issue(row, index, "invalid-or-uncorroborated-USD-per-DBU-value", sku, region);
      return;
    }
    const tier = row.plan.toLowerCase();
    const key = [source.cloud, region ?? "_", tier, sku].join(":");
    const group = groups.get(key) ?? {
      cloud: source.cloud,
      region,
      tier,
      sku,
      currency: "USD",
      unit: "DBU",
      sourceId: source.id,
      sourceCompute: row.compute,
      sourceRegion: row.region ?? null,
      observedOn,
      effectiveFrom: null,
      effectiveTo: null,
      values: new Set(),
      indexes: [],
    };
    group.values.add(value);
    group.indexes.push(index);
    groups.set(key, group);
  });
  const rates = [];
  for (const [key, group] of groups) {
    if (group.values.size !== 1) {
      issues.push({
        id: key,
        cloud: group.cloud,
        region: group.region,
        tier: group.tier,
        sku: group.sku,
        reason: "conflicting-calculator-values",
        sourceId: source.id,
        sourceRowIndexes: group.indexes,
        sourceValues: [...group.values].sort((a, b) => a - b),
      });
      continue;
    }
    const { values, indexes, ...record } = group;
    rates.push({ ...record, usdPerUnit: [...values][0], sourceRowIndex: indexes[0], matchedRows: indexes.length });
  }
  // The Virginia Enterprise Jobs row is anomalous relative to the paired Pipeline and other US rows.
  // Quarantine it until the publisher reconciles the discrepancy; do not silently substitute a price.
  const anomaly = rates.find(
    (row) =>
      row.cloud === "gcp" && row.region === "us-east4" && row.tier === "enterprise" && row.sku === "jobs_serverless",
  );
  const paired = rates.find(
    (row) =>
      row.cloud === "gcp" && row.region === "us-east4" && row.tier === "enterprise" && row.sku === "dlt_serverless",
  );
  if (anomaly && paired && anomaly.usdPerUnit > paired.usdPerUnit * 2) {
    rates.splice(rates.indexOf(anomaly), 1);
    issues.push({
      id: "gcp-us-east4-enterprise-jobs-anomaly",
      cloud: "gcp",
      region: "us-east4",
      tier: "enterprise",
      sku: "jobs_serverless",
      reason: "unreconciled-calculator-outlier-vs-paired-automated-SKU",
      sourceId: source.id,
      sourceRowIndexes: [anomaly.sourceRowIndex],
      sourceValues: [anomaly.usdPerUnit, paired.usdPerUnit],
    });
  }
  if (!rates.length) throw new Error(`${source.id}: no eligible USD/DBU rates were parsed`);
  return {
    source: {
      id: source.id,
      cloud: source.cloud,
      url: source.url,
      sha256: createHash("sha256").update(text).digest("hex"),
      bytes: Buffer.byteLength(text, "utf8"),
      rowCount: input.length,
      observedOn,
    },
    rates: rates.sort((a, b) =>
      [a.cloud, a.region ?? "", a.tier, a.sku]
        .join(":")
        .localeCompare([b.cloud, b.region ?? "", b.tier, b.sku].join(":")),
    ),
    issues,
    exclusions: [...exclusions].map(([reason, rowCount]) => ({ sourceId: source.id, reason, rowCount })),
  };
}
