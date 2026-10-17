import type ExcelJS from "exceljs";
import { neutralizeSpreadsheetFormula } from "@cayfore/engine";

/** Lava accent used by the page. Header text sits on it in white. */
const ACCENT = "FFFF3621";
const ZEBRA = "FFF6F6F7";
const LETTER_PAPER = 9;
const HEADER_HEIGHT = 22;
const BODY_ROW_HEIGHT = 18;

export const USD_FORMAT = '"$"#,##0.00';
export const PERCENT_FORMAT = "0.0%";

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
    paperSize: LETTER_PAPER,
    horizontalCentered: true,
  };
  sheet.headerFooter = {
    oddHeader: "&LCayfore&CForecast",
    evenHeader: "&LCayfore&CForecast",
    oddFooter: "&LNot affiliated with Databricks&RPage &P of &N",
    evenFooter: "&LNot affiliated with Databricks&RPage &P of &N",
  };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnCount } };
  sheet.properties.defaultRowHeight = BODY_ROW_HEIGHT;
}

export function styleHeader(sheet: ExcelJS.Worksheet, columnCount: number): void {
  const header = sheet.getRow(1);
  header.height = HEADER_HEIGHT;
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
  for (const column of columns) sheet.getColumn(column).numFmt = USD_FORMAT;
}

/** Shared frame for a data sheet: freeze, header, zebra, widths, and money columns. */
export function finishSheet(
  sheet: ExcelJS.Worksheet,
  frame: { columns: number; widths: number[]; firstRow: number; lastRow: number; money?: number[] },
): void {
  prepareSheet(sheet, frame.columns);
  styleHeader(sheet, frame.columns);
  zebra(sheet, frame.columns, frame.firstRow, frame.lastRow);
  widths(sheet, frame.widths);
  if (frame.money?.length) moneyFormat(sheet, frame.money);
}

export function percentFormat(sheet: ExcelJS.Worksheet, columns: number[]): void {
  for (const column of columns) sheet.getColumn(column).numFmt = PERCENT_FORMAT;
}
