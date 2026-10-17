import type ExcelJS from "exceljs";
import type { PortfolioProjection } from "@cayfore/engine";
import { listedRateDetails } from "../listed-rate.js";
import { registerForecastSheet } from "../registry.js";
import { finishSheet, safeText } from "../style.js";

const HEADERS = [
  "SKU",
  "$/DBU",
  "Source",
  "Confidence",
  "Band",
  "Citation",
  "Workload",
  "Cloud",
  "Region",
  "Tier",
  "Basis",
  "Workload ID",
];
const COLUMN_WIDTHS = [24, 12, 48, 14, 16, 72, 32, 14, 24, 16, 88, 36];
const MONEY_COLUMNS = [2];
const FIRST_DATA_ROW = 2;

function buildRates(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Rates");
  sheet.addRow(HEADERS);
  for (const line of result.estimate.lines) {
    const rate = listedRateDetails(result, line);
    sheet.addRow([
      safeText(line.sku),
      rate.price,
      safeText(rate.source),
      rate.confidence,
      safeText(rate.band),
      safeText(line.notes[0] ?? line.rateProvenance?.label ?? ""),
      safeText(line.name),
      safeText(rate.cloud),
      safeText(rate.region),
      safeText(rate.tier),
      safeText(rate.basis),
      safeText(line.workloadId),
    ]);
  }
  finishSheet(sheet, {
    columns: HEADERS.length,
    widths: COLUMN_WIDTHS,
    firstRow: FIRST_DATA_ROW,
    lastRow: sheet.rowCount,
    money: MONEY_COLUMNS,
  });
}

registerForecastSheet({ id: "rates", name: "Rates", build: buildRates });
