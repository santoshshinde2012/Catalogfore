import { productCatalog } from "@cayfore/catalog";
import { PRODUCT_NAME, pricesUpdatedOn, type PortfolioProjection } from "@cayfore/engine";
import type ExcelJS from "exceljs";
import { registerForecastSheet } from "../registry.js";
import { PERCENT_FORMAT, USD_FORMAT, prepareSheet, safeText, styleHeader, widths, zebra } from "../style.js";

const MONTHLY_SHEET = "Monthly forecast";
const TITLE_ROW = 1;
const COLUMN_WIDTHS = [28, 88];
const MONEY_FIELDS = new Set(["Starting monthly spend", "Annual total", "Low", "High"]);
const PERCENT_FIELDS = new Set(["Monthly growth", "Commitment discount"]);

function buildSummary(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  const { portfolio } = result;
  const simple = portfolio.simple;
  const rows: [string, string | number | { formula: string }][] = [
    ["Field", "Value"],
    ["Cloud", portfolio.cloud.toUpperCase()],
    ["Tier", portfolio.tier],
    ["Region", portfolio.region],
    ["Starting monthly spend", simple?.monthlySpend ?? result.listMonthly],
    ["Monthly growth", simple?.monthlyGrowth ?? 0],
    ["Commitment discount", simple?.commitDiscount ?? portfolio.commitment.dbuDiscount],
    ["Annual total", { formula: `'${MONTHLY_SHEET}'!C${annualTotalRow(workbook)}` }],
    ["Low", result.band.low],
    ["High", result.band.high],
    ["Product catalog", productCatalog.version],
    ["Prices updated", pricesUpdatedOn],
    ["Pricing catalog", `${result.estimate.catalogVersion} verified ${result.estimate.verifiedOn}`],
    ["Disclaimer", "Not affiliated with Databricks. Estimates only, not a quote."],
  ];
  sheet.addRow([PRODUCT_NAME, "Independent Databricks cost forecast"]);
  for (const [label, value] of rows)
    sheet.addRow([safeText(label), typeof value === "string" ? safeText(value) : value]);
  sheet.addRow(["Assumptions", ""]);
  for (const line of result.assumptions) sheet.addRow(["", safeText(line)]);
  prepareSheet(sheet, 2);
  styleHeader(sheet, 2);
  zebra(sheet, 2, TITLE_ROW + 2, sheet.rowCount);
  widths(sheet, COLUMN_WIDTHS);
  rows.forEach(([label], index) => {
    const cell = sheet.getCell(index + TITLE_ROW + 1, 2);
    if (MONEY_FIELDS.has(label)) cell.numFmt = USD_FORMAT;
    if (PERCENT_FIELDS.has(label)) cell.numFmt = PERCENT_FORMAT;
  });
}

function annualTotalRow(workbook: ExcelJS.Workbook): number {
  const monthly = workbook.getWorksheet(MONTHLY_SHEET);
  if (!monthly) throw new Error(`${MONTHLY_SHEET} is missing`);
  return monthly.rowCount;
}

registerForecastSheet({ id: "summary", name: "Summary", build: buildSummary });
