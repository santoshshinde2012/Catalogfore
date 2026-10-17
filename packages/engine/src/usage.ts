import { matchBilling } from "./billing-skus.js";
import { parseCsv } from "./csv.js";
export { parseCsv } from "./csv.js";
import type { UsagePoint } from "./forecast/series.js";
import type { UsageImport } from "./types.js";

export function mapSkuName(skuName: string): string {
  return matchBilling(skuName).engineSku;
}

export interface ProductUsage {
  productId: string;
  engineSku: string;
  unit: string;
  quantity: number;
  /** Sum of quantity × list price when the file has a price. Null when it does not. */
  dollars: number | null;
  skuNames: string[];
}

export interface ProductUsageImport {
  products: ProductUsage[];
  unmapped: { skuName: string; unit: string; quantity: number }[];
  warnings: string[];
}

export interface UsageHistory {
  months: UsagePoint[];
  days: UsagePoint[];
  unit: "usd" | "dbu";
}

const PRICE_KEYS = ["list_price", "price", "pricing_default", "effective_list"];

export function usageHistory(text: string): UsageHistory {
  const records = parseCsv(text);
  const priced = records.some((record) => priceOf(record) != null);
  const days = new Map<string, number>();
  const months = new Map<string, number>();
  for (const record of records) {
    const date = usageDate(record);
    if (!date) continue;
    const unit = (record.usage_unit ?? record.unit ?? "DBU").trim().toUpperCase();
    if (unit && unit !== "DBU") continue;
    const quantity = Number((record.usage_quantity ?? record.dbus ?? record.dbu ?? "").replace(/,/g, ""));
    if (!Number.isFinite(quantity)) continue;
    const price = priceOf(record);
    const amount = priced ? quantity * (price ?? 0) : quantity;
    if (priced && price == null) continue;
    const day = date.slice(0, 10);
    const month = day.slice(0, 7);
    days.set(day, (days.get(day) ?? 0) + amount);
    months.set(month, (months.get(month) ?? 0) + amount);
  }
  return {
    unit: priced ? "usd" : "dbu",
    days: [...days.entries()].sort().map(([period, amount]) => ({ period, amount })),
    months: [...months.entries()].sort().map(([period, amount]) => ({ period, amount })),
  };
}

function priceOf(record: Record<string, string>): number | null {
  for (const key of PRICE_KEYS) {
    if (!(key in record)) continue;
    const value = Number(record[key].replace(/[$,\s]/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function usageDate(record: Record<string, string>): string | null {
  const raw = (record.usage_date ?? record.date ?? "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function importUsageCsv(text: string, month?: string): UsageImport {
  const records = parseCsv(text).filter((record) => {
    if (!month) return true;
    const date = usageDate(record);
    return date ? date.slice(0, 7) === month : false;
  });
  const warnings: string[] = [];
  if (!records.length) warnings.push("No data rows found. Export system.billing.usage as CSV with a header row.");
  const quantityKey = records[0]
    ? Object.keys(records[0]).find((key) => key === "usage_quantity" || key === "dbus" || key === "dbu")
    : undefined;
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

export function importUsageProducts(text: string): ProductUsageImport {
  const records = parseCsv(text);
  const warnings: string[] = [];
  if (!records.length) warnings.push("No data rows found. Export system.billing.usage as CSV with a header row.");
  const groups = new Map<
    string,
    {
      productId: string;
      engineSku: string;
      unit: string;
      quantity: number;
      dollars: number;
      priced: number;
      skuNames: Set<string>;
    }
  >();
  const unmapped = new Map<string, { skuName: string; unit: string; quantity: number }>();
  for (const record of records) {
    const quantity = Number((record.usage_quantity ?? record.dbus ?? record.dbu ?? "").replace(/,/g, ""));
    if (!Number.isFinite(quantity)) continue;
    const unit = (record.usage_unit ?? record.unit ?? "DBU").trim().toUpperCase() || "DBU";
    const skuName = (record.sku_name ?? record.sku ?? "UNKNOWN").trim() || "UNKNOWN";
    const match = matchBilling(skuName, record.billing_origin_product ?? "");
    if (!match.productId) {
      const key = `${skuName}|${unit}`;
      const prior = unmapped.get(key);
      unmapped.set(key, { skuName, unit, quantity: (prior?.quantity ?? 0) + quantity });
      continue;
    }
    const key = `${match.productId}|${unit}`;
    const prior = groups.get(key) ?? {
      productId: match.productId,
      engineSku: match.engineSku,
      unit,
      quantity: 0,
      dollars: 0,
      priced: 0,
      skuNames: new Set<string>(),
    };
    prior.quantity += quantity;
    prior.skuNames.add(skuName);
    const price = priceOf(record);
    if (price != null) {
      prior.dollars += quantity * price;
      prior.priced += 1;
    }
    groups.set(key, prior);
  }
  const products = [...groups.values()]
    .map((group) => ({
      productId: group.productId,
      engineSku: group.engineSku,
      unit: group.unit,
      quantity: Math.round(group.quantity * 1000) / 1000,
      dollars: group.priced > 0 ? Math.round(group.dollars * 100) / 100 : null,
      skuNames: [...group.skuNames].sort(),
    }))
    .sort((a, b) => (b.dollars ?? b.quantity) - (a.dollars ?? a.quantity));
  if (unmapped.size) warnings.push(`${unmapped.size} sku names are not in the catalog map.`);
  return { products, unmapped: [...unmapped.values()], warnings };
}

export function scaleForActuals(estimatedDbu: number, actualDbu: number): number {
  if (estimatedDbu <= 0 || actualDbu < 0) return 1;
  return actualDbu / estimatedDbu;
}
