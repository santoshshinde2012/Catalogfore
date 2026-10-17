import type ExcelJS from "exceljs";
import { neutralizeSpreadsheetFormula } from "@cayfore/engine";

/** Lava accent used by the page. Header text sits on it in white. */
const ACCENT = "FFFF3621";
const ZEBRA = "FFF6F6F7";

export function safeText(value: string): string {
  return neutralizeSpreadsheetFormula(value);
}

export function prepareSheet(sheet: ExcelJS.Worksheet, columnCount: number): void {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalCentered: true,
  };
  sheet.headerFooter = {
    oddHeader: "&LCayfore&CForecast",
    evenHeader: "&LCayfore&CForecast",
    oddFooter: "&LNot affiliated with Databricks&RPage &P of &N",
    evenFooter: "&LNot affiliated with Databricks&RPage &P of &N",
  };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnCount } };
  sheet.properties.defaultRowHeight = 18;
}

export function styleHeader(sheet: ExcelJS.Worksheet, columnCount: number): void {
  const header = sheet.getRow(1);
  header.height = 22;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = header.getCell(column);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
    cell.alignment = { vertical: "middle", wrapText: true };
  }
}

export function zebra(sheet: ExcelJS.Worksheet, columnCount: number, firstDataRow: number, lastDataRow: number): void {
  for (let row = firstDataRow; row <= lastDataRow; row += 1) {
    if ((row - firstDataRow) % 2 === 1) {
      for (let column = 1; column <= columnCount; column += 1) {
        sheet.getRow(row).getCell(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      }
    }
  }
}

export function widths(sheet: ExcelJS.Worksheet, sizes: number[]): void {
  sizes.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

export function moneyFormat(sheet: ExcelJS.Worksheet, columns: number[]): void {
  for (const column of columns) sheet.getColumn(column).numFmt = '"$"#,##0.00';
}

export function percentFormat(sheet: ExcelJS.Worksheet, columns: number[]): void {
  for (const column of columns) sheet.getColumn(column).numFmt = "0.0%";
}
