import type ExcelJS from "exceljs";
import type { PortfolioProjection } from "@cayfore/engine";
import { listedRate } from "../listed-rate.js";
import { registerForecastSheet } from "../registry.js";
import { finishSheet, percentFormat, safeText } from "../style.js";

const HEADERS = ["Workload", "SKU", "DBU", "$/DBU", "DBU cost", "Cloud VM cost", "Total", "Share"];
const COLUMN_WIDTHS = [28, 22, 12, 12, 14, 16, 14, 12];
const MONEY_COLUMNS = [4, 5, 6, 7];
const SHARE_COLUMN = [8];
const FIRST_DATA_ROW = 2;

function buildBreakdown(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Breakdown");
  sheet.addRow(HEADERS);
  const lines = result.estimate.lines;
  lines.forEach((line) => {
    const row = sheet.rowCount + 1;
    sheet.addRow([
      safeText(line.name),
      safeText(line.sku),
      line.dbu,
      listedRate(result, line),
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
  finishSheet(sheet, {
    columns: HEADERS.length,
    widths: COLUMN_WIDTHS,
    firstRow: FIRST_DATA_ROW,
    lastRow: last,
    money: MONEY_COLUMNS,
  });
  percentFormat(sheet, SHARE_COLUMN);
  sheet.getColumn(3).numFmt = "#,##0.00";
}

registerForecastSheet({ id: "breakdown", name: "Breakdown", build: buildBreakdown });
