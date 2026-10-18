import { PRODUCT_NAME, type PortfolioProjection } from "@cayfore/engine";
import ExcelJS from "exceljs";
import { forecastSheets } from "./registry.js";
import "./sheets/load.js";

export function forecastWorkbookName(cloud: string, exportedOn = new Date()): string {
  return `${PRODUCT_NAME.toLowerCase()}-forecast-${cloud}-${exportedOn.toISOString().slice(0, 10)}.xlsx`;
}

export async function buildForecastWorkbook(result: PortfolioProjection, exportedOn = new Date()): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = PRODUCT_NAME;
  workbook.lastModifiedBy = PRODUCT_NAME;
  workbook.created = exportedOn;
  workbook.modified = exportedOn;
  workbook.title = `${PRODUCT_NAME} forecast`;
  workbook.subject = "Independent Databricks cost estimate";
  workbook.description = "Not affiliated with Databricks. Estimates only, not a quote.";
  workbook.category = "Forecast";
  workbook.company = PRODUCT_NAME;
  for (const sheet of forecastSheets()) sheet.build(workbook, result);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
