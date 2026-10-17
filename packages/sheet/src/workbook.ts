import { productCatalog } from "@cayfore/catalog";
import { pricesUpdatedOn, recommendations, type PortfolioProjection } from "@cayfore/engine";
import ExcelJS from "exceljs";
import confidenceFile from "../../../data/rate-confidence.json";
import { addBreakdown, addMonthly, addProducts, addRates, addSavings } from "./tables.js";
import { prepareSheet, safeText, styleHeader, widths, zebra } from "./style.js";

type ConfidenceFile = {
  cells: { cloud: string; region: string; tier: string; sku: string; score: number; band: string }[];
  products: Record<string, { score: number; band: string }>;
};

const confidence = confidenceFile as ConfidenceFile;

export function forecastWorkbookName(cloud: string, exportedOn = new Date()): string {
  return `cayfore-forecast-${cloud}-${exportedOn.toISOString().slice(0, 10)}.xlsx`;
}

export async function buildForecastWorkbook(result: PortfolioProjection, exportedOn = new Date()): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cayfore";
  workbook.lastModifiedBy = "Cayfore";
  workbook.created = exportedOn;
  workbook.modified = exportedOn;
  workbook.title = "Cayfore forecast";
  workbook.subject = "Independent Databricks cost estimate";
  workbook.description = "Not affiliated with Databricks. Estimates only, not a quote.";
  workbook.category = "Forecast";
  workbook.company = "Cayfore";
  const lastMonthRow = addMonthly(workbook, result);
  addSummary(workbook, result, lastMonthRow);
  addBreakdown(workbook, result);
  addProducts(workbook, result);
  addSavings(workbook, recommendations(result.portfolio));
  addRates(workbook, result, scoreMap(), confidence.products);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function addSummary(workbook: ExcelJS.Workbook, result: PortfolioProjection, lastMonthRow: number): void {
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
    ["Annual total", { formula: `'Monthly forecast'!C${lastMonthRow + 1}` }],
    ["Low", result.band.low],
    ["High", result.band.high],
    ["Product catalog", productCatalog.version],
    ["Prices updated", pricesUpdatedOn],
    ["Pricing catalog", `${result.estimate.catalogVersion} verified ${result.estimate.verifiedOn}`],
    ["Disclaimer", "Not affiliated with Databricks. Estimates only, not a quote."],
  ];
  sheet.addRow(["Cayfore", "Independent Databricks cost forecast"]);
  for (const [label, value] of rows)
    sheet.addRow([safeText(label), typeof value === "string" ? safeText(value) : value]);
  sheet.addRow(["Assumptions", ""]);
  for (const line of result.assumptions) sheet.addRow(["", safeText(line)]);
  prepareSheet(sheet, 2);
  styleHeader(sheet, 2);
  zebra(sheet, 2, 3, sheet.rowCount);
  widths(sheet, [28, 88]);
  for (const cell of ["B6", "B9", "B10", "B11"]) sheet.getCell(cell).numFmt = '"$"#,##0.00';
  sheet.getCell("B7").numFmt = "0.0%";
  sheet.getCell("B8").numFmt = "0.0%";
}

function scoreMap(): Map<string, ConfidenceFile["cells"][number]> {
  return new Map(confidence.cells.map((cell) => [`${cell.cloud}|${cell.region}|${cell.tier}|${cell.sku}`, cell]));
}
