import type ExcelJS from "exceljs";
import type { PortfolioProjection } from "@cayfore/engine";

/** One worksheet. Every sheet receives the same forecast and returns nothing. */
export type ForecastSheet = {
  id: string;
  name: string;
  build(workbook: ExcelJS.Workbook, result: PortfolioProjection): void;
};
