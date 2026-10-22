import type ExcelJS from "exceljs";
import { recommendations, type PortfolioProjection } from "@cayfore/engine";
import { registerForecastSheet } from "../registry.js";
import { finishSheet, safeText } from "../style.js";

const HEADERS = ["Recommendation", "Annual savings", "Detail"];
const COLUMN_WIDTHS = [32, 18, 72];
const MONEY_COLUMNS = [2];
const FIRST_DATA_ROW = 2;

function buildSavings(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Savings");
  const rows = recommendations(result.portfolio);
  sheet.addRow(HEADERS);
  if (!rows.length) sheet.addRow(["None", 0, "No separate saving is available for this plan."]);
  for (const row of rows) sheet.addRow([safeText(row.title), row.annualSavings, safeText(row.detail)]);
  const last = Math.max(sheet.rowCount, FIRST_DATA_ROW);
  if (rows.length) {
    const total = sheet.addRow(["Listed separately", "", "Do not add these together. They overlap."]);
    total.font = { bold: true };
  }
  finishSheet(sheet, {
    columns: HEADERS.length,
    widths: COLUMN_WIDTHS,
    firstRow: FIRST_DATA_ROW,
    lastRow: last,
    money: MONEY_COLUMNS,
  });
}

registerForecastSheet({ id: "savings", name: "Savings", build: buildSavings });
