import type { UsageImport } from "./types.js";

const SKU_RULES: { pattern: RegExp; sku: string }[] = [
  { pattern: /JOBS_SERVERLESS|SERVERLESS_JOBS/i, sku: "jobs_serverless" },
  { pattern: /ALL_PURPOSE_SERVERLESS|SERVERLESS_ALL_PURPOSE|NOTEBOOK_SERVERLESS/i, sku: "all_purpose_serverless" },
  { pattern: /DLT_SERVERLESS|SERVERLESS_DLT|PIPELINES_SERVERLESS/i, sku: "dlt_serverless" },
  { pattern: /JOBS_COMPUTE|JOBS_LIGHT/i, sku: "jobs_classic" },
  { pattern: /ALL_PURPOSE/i, sku: "all_purpose_classic" },
  { pattern: /DLT_ADVANCED|PIPELINE_ADVANCED/i, sku: "dlt_advanced" },
  { pattern: /DLT_PRO|PIPELINE_PRO/i, sku: "dlt_pro" },
  { pattern: /DLT_CORE|PIPELINE_CORE|DLT_COMPUTE/i, sku: "dlt_core" },
  { pattern: /SERVERLESS_SQL|SQL_SERVERLESS/i, sku: "sql_serverless" },
  { pattern: /SQL_PRO/i, sku: "sql_pro" },
  { pattern: /SQL/i, sku: "sql_classic" },
  { pattern: /INFERENCE|MODEL_SERVING|FOUNDATION/i, sku: "model_serving" },
  { pattern: /VECTOR_SEARCH|AI_SEARCH/i, sku: "ai_search" },
];

export function mapSkuName(skuName: string): string {
  const found = SKU_RULES.find((rule) => rule.pattern.test(skuName));
  return found?.sku ?? "other";
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows[0].map((value) => value.trim().toLowerCase());
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = values[index] ?? "";
    });
    return record;
  });
}

export function importUsageCsv(text: string): UsageImport {
  const records = parseCsv(text);
  const warnings: string[] = [];
  if (!records.length) warnings.push("No data rows found. Export system.billing.usage as CSV with a header row.");
  const quantityKey = records[0] ? Object.keys(records[0]).find((key) => key === "usage_quantity" || key === "dbus" || key === "dbu") : undefined;
  if (records.length && !quantityKey) warnings.push("Could not find a usage_quantity column.");
  const totals = new Map<string, number>();
  let skippedRows = 0;
  let usedRows = 0;
  for (const record of records) {
    const unit = (record.usage_unit ?? record.unit ?? "DBU").trim().toUpperCase();
    if (unit && unit !== "DBU") {
      skippedRows += 1;
      continue;
    }
    const raw = record[quantityKey ?? "usage_quantity"] ?? "";
    const quantity = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(quantity)) {
      skippedRows += 1;
      continue;
    }
    const skuName = record.sku_name ?? record.sku ?? "UNKNOWN";
    const sku = mapSkuName(skuName);
    totals.set(sku, (totals.get(sku) ?? 0) + quantity);
    usedRows += 1;
  }
  const bySku = [...totals.entries()]
    .map(([sku, dbu]) => ({ sku, dbu: Math.round(dbu * 1000) / 1000 }))
    .sort((a, b) => b.dbu - a.dbu);
  const dbu = Math.round(bySku.reduce((sum, row) => sum + row.dbu, 0) * 1000) / 1000;
  if (skippedRows) warnings.push(`${skippedRows} non-DBU or unreadable rows were skipped.`);
  return { dbu, bySku, skippedRows, usedRows, warnings };
}

export function scaleForActuals(estimatedDbu: number, actualDbu: number): number {
  if (estimatedDbu <= 0 || actualDbu < 0) return 1;
  return actualDbu / estimatedDbu;
}
