import { matchBilling } from "../billing-skus.js";
import { roundMoney } from "../money.js";
import type {
  ProductUsage,
  UnmappedUsage,
  UsageAttribution,
  UsageCoverage,
  UsageHistory,
  UsageRecord,
} from "./types.js";

export function usageCoverage(records: readonly UsageRecord[], skippedRows = 0): UsageCoverage {
  const pricedRows = records.filter((record) => record.cost != null).length;
  return { usedRows: records.length, skippedRows, pricedRows, unpricedRows: records.length - pricedRows };
}

export function historyFromRecords(records: readonly UsageRecord[]): UsageHistory {
  const coverage = usageCoverage(records);
  const allDbu = records.every((record) => record.unit === "DBU");
  const useDollars = coverage.pricedRows > 0 && (!allDbu || coverage.unpricedRows === 0);
  const days = new Map<string, number>();
  const months = new Map<string, number>();
  const warnings: string[] = [];
  if (coverage.pricedRows && coverage.unpricedRows)
    warnings.push(
      useDollars
        ? "Observed dollar history has incomplete price coverage; unpriced quantities remain visible in the import preview."
        : "Observed history uses DBUs because only part of the usage has prices; no unpriced DBUs are discarded.",
    );
  if (!useDollars && !allDbu && records.length)
    warnings.push("Unpriced non-DBU units cannot be combined into one observed series.");
  for (const record of records) {
    if (!record.date) continue;
    const amount = useDollars ? record.cost?.amount : record.unit === "DBU" ? record.quantity : undefined;
    if (amount == null) continue;
    const month = record.date.slice(0, 7);
    days.set(record.date, (days.get(record.date) ?? 0) + amount);
    months.set(month, (months.get(month) ?? 0) + amount);
  }
  const points = (map: Map<string, number>) =>
    [...map].sort().map(([period, amount]) => ({ period, amount: roundMoney(amount) }));
  return { unit: useDollars ? "usd" : "dbu", days: points(days), months: points(months), coverage, warnings };
}

interface Group extends ProductUsage {
  bases: Set<string>;
  names: Set<string>;
}

export function productsFromRecords(records: readonly UsageRecord[]): {
  products: ProductUsage[];
  unmapped: UnmappedUsage[];
} {
  const groups = new Map<string, Group>();
  for (const record of records) {
    const match = matchBilling(record.skuName, record.billingOriginProduct);
    const key = [match.productId ?? record.skuName, record.unit, record.cloud ?? "", record.region ?? ""].join("|");
    const group = groups.get(key) ?? {
      productId: match.productId ?? "",
      engineSku: match.engineSku,
      unit: record.unit,
      cloud: record.cloud,
      region: record.region,
      quantity: 0,
      dollars: null,
      unpricedQuantity: 0,
      pricedRows: 0,
      unpricedRows: 0,
      costBasis: null,
      skuNames: [],
      names: new Set<string>(),
      bases: new Set<string>(),
    };
    group.quantity += record.quantity;
    group.names.add(record.skuName);
    if (record.cost) {
      group.dollars = (group.dollars ?? 0) + record.cost.amount;
      group.pricedRows += 1;
      group.bases.add(record.cost.basis);
    } else {
      group.unpricedQuantity += record.quantity;
      group.unpricedRows += 1;
    }
    groups.set(key, group);
  }
  const products: ProductUsage[] = [];
  const unmapped: UnmappedUsage[] = [];
  for (const { names, bases, ...group } of groups.values()) {
    const row: ProductUsage = {
      ...group,
      dollars: group.dollars == null ? null : roundMoney(group.dollars),
      quantity: roundQuantity(group.quantity),
      unpricedQuantity: roundQuantity(group.unpricedQuantity),
      costBasis: bases.size > 1 ? "mixed" : (([...bases][0] as ProductUsage["costBasis"] | undefined) ?? null),
      skuNames: [...names].sort(),
    };
    if (row.productId) products.push(row);
    else unmapped.push({ ...row, skuName: row.skuNames[0] });
  }
  products.sort((a, b) => (b.dollars ?? b.quantity) - (a.dollars ?? a.quantity));
  return { products, unmapped };
}

export function dbuFromRecords(records: readonly UsageRecord[]): {
  dbu: number;
  bySku: { sku: string; dbu: number }[];
} {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (record.unit !== "DBU") continue;
    const sku = matchBilling(record.skuName, record.billingOriginProduct).engineSku;
    totals.set(sku, (totals.get(sku) ?? 0) + record.quantity);
  }
  const bySku = [...totals].map(([sku, dbu]) => ({ sku, dbu: roundQuantity(dbu) })).sort((a, b) => b.dbu - a.dbu);
  return { dbu: roundQuantity(bySku.reduce((sum, row) => sum + row.dbu, 0)), bySku };
}

/** Explicit group selection is pure and never sends owner identities outside the caller. */
export function attributeUsageRecords(records: readonly UsageRecord[], key = "owner"): UsageAttribution[] {
  const groups = new Map<string, UsageAttribution>();
  for (const record of records) {
    const owner =
      record.tags.team ??
      record.tags.cost_center ??
      record.tags.owner ??
      record.identity.owned_by ??
      record.identity.run_as;
    const label =
      (key === "owner"
        ? owner
        : key === "workspace"
          ? record.workspaceId
          : (record.tags[key] ?? record.identity[key] ?? record.metadata[key])) || "Unattributed";
    const group = groups.get(label) ?? { key, label, amount: 0, quantity: 0, rows: 0, unpricedRows: 0 };
    group.amount += record.cost?.amount ?? 0;
    group.quantity += record.quantity;
    group.rows += 1;
    if (!record.cost) group.unpricedRows += 1;
    groups.set(label, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, amount: roundMoney(group.amount), quantity: roundQuantity(group.quantity) }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}
