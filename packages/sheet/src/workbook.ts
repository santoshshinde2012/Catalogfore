import type { PortfolioProjection } from "@cayfore/engine";
import ExcelJS from "exceljs";
import { forecastSheets } from "./registry.js";
import "./sheets/load.js";

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
  for (const sheet of forecastSheets()) sheet.build(workbook, result);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
