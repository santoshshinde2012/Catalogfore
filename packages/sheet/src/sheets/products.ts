import type ExcelJS from "exceljs";
import type { PortfolioProjection } from "@cayfore/engine";
import { registerForecastSheet } from "../registry.js";
import { finishSheet, safeText } from "../style.js";

const HEADERS = ["Product", "Workload", "SKU", "Total USD"];
const COLUMN_WIDTHS = [28, 32, 22, 16];
const MONEY_COLUMNS = [4];
const FIRST_DATA_ROW = 2;

function buildProducts(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Products");
  sheet.addRow(HEADERS);
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
  finishSheet(sheet, {
    columns: HEADERS.length,
    widths: COLUMN_WIDTHS,
    firstRow: FIRST_DATA_ROW,
    lastRow: sheet.rowCount,
    money: MONEY_COLUMNS,
  });
}

registerForecastSheet({ id: "products", name: "Products", build: buildProducts });
