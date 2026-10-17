import type { ForecastSheet } from "./sheet.js";

const sheets: ForecastSheet[] = [];

export function registerForecastSheet(sheet: ForecastSheet): void {
  if (sheets.some((existing) => existing.id === sheet.id)) throw new Error(`duplicate sheet ${sheet.id}`);
  sheets.push(sheet);
}

export function forecastSheets(): readonly ForecastSheet[] {
  return sheets;
}
