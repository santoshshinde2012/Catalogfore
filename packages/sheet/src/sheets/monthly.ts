import type ExcelJS from "exceljs";
import type { PortfolioProjection } from "@cayfore/engine";
import { registerForecastSheet } from "../registry.js";
import { finishSheet, safeText } from "../style.js";

const HEADERS = ["Month", "Period", "Base USD", "Low USD", "High USD", "Cumulative USD"];
const MONEY_COLUMNS = [3, 4, 5, 6];
const COLUMN_WIDTHS = [12, 14, 16, 16, 16, 18];
const FIRST_DATA_ROW = 2;

function buildMonthly(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Monthly forecast");
  sheet.addRow(HEADERS);
  result.months.forEach((month, index) => {
    const row = index + FIRST_DATA_ROW;
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
  finishSheet(sheet, {
    columns: HEADERS.length,
    widths: COLUMN_WIDTHS,
    firstRow: FIRST_DATA_ROW,
    lastRow: last,
    money: MONEY_COLUMNS,
  });
  sheet.getColumn(1).numFmt = "0";
}

registerForecastSheet({ id: "monthly", name: "Monthly forecast", build: buildMonthly });
