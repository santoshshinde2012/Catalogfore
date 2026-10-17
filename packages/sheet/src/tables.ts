import type ExcelJS from "exceljs";
import { skuRate, type LineItem, type PortfolioProjection, type SkuId } from "@cayfore/engine";
import { moneyFormat, percentFormat, prepareSheet, safeText, styleHeader, widths, zebra } from "./style.js";

type CellScore = { cloud: string; region: string; tier: string; sku: string; score: number; band: string };

export function addMonthly(workbook: ExcelJS.Workbook, result: PortfolioProjection): number {
  const sheet = workbook.addWorksheet("Monthly forecast");
  const headers = ["Month", "Period", "Base USD", "Low USD", "High USD", "Cumulative USD"];
  sheet.addRow(headers);
  result.months.forEach((month, index) => {
    const row = index + 2;
    sheet.addRow([
      month.month,
      safeText(result.points[index]?.period ?? ""),
      month.expected,
      month.low,
      month.high,
      { formula: `SUM($C$2:C${row})` },
    ]);
  });
  const last = result.months.length + 1;
  const total = sheet.addRow([
    "Total",
    "",
    { formula: `SUM(C2:C${last})` },
    { formula: `SUM(D2:D${last})` },
    { formula: `SUM(E2:E${last})` },
    "",
  ]);
  total.font = { bold: true };
  prepareSheet(sheet, headers.length);
  styleHeader(sheet, headers.length);
  zebra(sheet, headers.length, 2, last);
  widths(sheet, [12, 14, 16, 16, 16, 18]);
  moneyFormat(sheet, [3, 4, 5, 6]);
  sheet.getColumn(1).numFmt = "0";
  return last;
}

export function addBreakdown(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Breakdown");
  const headers = ["Workload", "SKU", "DBU", "$/DBU", "DBU cost", "Cloud VM cost", "Total", "Share"];
  sheet.addRow(headers);
  const lines = result.estimate.lines;
  lines.forEach((line) => {
    const row = sheet.rowCount + 1;
    sheet.addRow([
      safeText(line.name),
      safeText(line.sku),
      line.dbu,
      rateOrBlank(result, line),
      line.dbuCost,
      line.cloudCost,
      line.total,
      { formula: `IF(SUM($G$2:$G$${lines.length + 1})=0,0,G${row}/SUM($G$2:$G$${lines.length + 1}))` },
    ]);
  });
  const last = Math.max(lines.length + 1, 1);
  if (lines.length) {
    const total = sheet.addRow([
      "Total",
      "",
      { formula: `SUM(C2:C${last})` },
      "",
      { formula: `SUM(E2:E${last})` },
      { formula: `SUM(F2:F${last})` },
      { formula: `SUM(G2:G${last})` },
      { formula: `SUM(H2:H${last})` },
    ]);
    total.font = { bold: true };
  }
  prepareSheet(sheet, headers.length);
  styleHeader(sheet, headers.length);
  zebra(sheet, headers.length, 2, last);
  widths(sheet, [28, 22, 12, 12, 14, 16, 14, 12]);
  moneyFormat(sheet, [4, 5, 6, 7]);
  percentFormat(sheet, [8]);
  sheet.getColumn(3).numFmt = "#,##0.00";
}

export function addProducts(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Products");
  const headers = ["Product", "Workload", "SKU", "Total USD"];
  sheet.addRow(headers);
  const added = result.portfolio.workloads.filter((workload) => workload.productId);
  const lines = new Map(result.estimate.lines.map((line) => [line.workloadId, line]));
  if (!added.length) sheet.addRow(["None", "No extra catalog products were added.", "", ""]);
  for (const workload of added) {
    const line = lines.get(workload.id);
    sheet.addRow([
      safeText(workload.productId ?? ""),
      safeText(workload.name),
      safeText(line?.sku ?? ""),
      line?.total ?? 0,
    ]);
  }
  prepareSheet(sheet, headers.length);
  styleHeader(sheet, headers.length);
  zebra(sheet, headers.length, 2, sheet.rowCount);
  widths(sheet, [28, 32, 22, 16]);
  moneyFormat(sheet, [4]);
}

export function addSavings(
  workbook: ExcelJS.Workbook,
  rows: { title: string; detail: string; annualSavings: number }[],
): void {
  const sheet = workbook.addWorksheet("Savings");
  const headers = ["Recommendation", "Annual savings", "Detail"];
  sheet.addRow(headers);
  if (!rows.length) sheet.addRow(["None", 0, "No separate saving is available for this plan."]);
  for (const row of rows) sheet.addRow([safeText(row.title), row.annualSavings, safeText(row.detail)]);
  const last = Math.max(sheet.rowCount, 2);
  if (rows.length) {
    const total = sheet.addRow([
      "Listed separately",
      { formula: `SUM(B2:B${last})` },
      "Do not add these together. They overlap.",
    ]);
    total.font = { bold: true };
  }
  prepareSheet(sheet, headers.length);
  styleHeader(sheet, headers.length);
  zebra(sheet, headers.length, 2, last);
  widths(sheet, [32, 18, 72]);
  moneyFormat(sheet, [2]);
}

export function addRates(
  workbook: ExcelJS.Workbook,
  result: PortfolioProjection,
  scores: Map<string, CellScore>,
  products: Record<string, { score: number; band: string }>,
): void {
  const sheet = workbook.addWorksheet("Rates");
  const headers = ["SKU", "$/DBU", "Source", "Confidence", "Band", "Citation"];
  sheet.addRow(headers);
  const seen = new Set<string>();
  for (const line of result.estimate.lines) {
    if (seen.has(line.sku)) continue;
    seen.add(line.sku);
    const key = `${result.portfolio.cloud}|${result.portfolio.region}|${result.portfolio.tier}|${line.sku}`;
    const score = scores.get(key);
    const product = productScore(result, line, products);
    sheet.addRow([
      safeText(line.sku),
      rateOrBlank(result, line),
      safeText(line.rateProvenance?.source ?? line.rateProvenance?.label ?? "Curated list"),
      score?.score ?? product?.score ?? "",
      safeText(score?.band ?? product?.band ?? ""),
      safeText(line.notes[0] ?? line.rateProvenance?.label ?? ""),
    ]);
  }
  prepareSheet(sheet, headers.length);
  styleHeader(sheet, headers.length);
  zebra(sheet, headers.length, 2, sheet.rowCount);
  widths(sheet, [24, 12, 28, 14, 16, 72]);
  moneyFormat(sheet, [2]);
}

function rateOrBlank(result: PortfolioProjection, line: LineItem): number | "" {
  try {
    return skuRate(result.portfolio.cloud, result.portfolio.tier, line.sku as SkuId);
  } catch {
    return "";
  }
}

function productScore(
  result: PortfolioProjection,
  line: LineItem,
  products: Record<string, { score: number; band: string }>,
): { score: number; band: string } | undefined {
  const workload = result.portfolio.workloads.find((item) => item.id === line.workloadId);
  return workload?.productId ? products[workload.productId] : undefined;
}
