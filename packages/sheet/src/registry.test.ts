import { describe, expect, it } from "vitest";
import { forecastSheets, registerForecastSheet } from "./registry";
import type { ForecastSheet } from "./sheet";
import "./sheets/load";

const EXPECTED = ["monthly", "summary", "breakdown", "products", "savings", "rates"];

describe("forecast sheet registry", () => {
  it("registers every sheet with the same contract, in workbook order", () => {
    const sheets = forecastSheets();
    expect(sheets.map((sheet) => sheet.id)).toEqual(EXPECTED);
    expect(sheets.map((sheet) => sheet.name)).toEqual([
      "Monthly forecast",
      "Summary",
      "Breakdown",
      "Products",
      "Savings",
      "Rates",
    ]);
    for (const sheet of sheets) expect(sheet.build).toHaveLength(2);
    const ids = new Set(sheets.map((sheet) => sheet.id));
    expect(ids.size).toBe(sheets.length);
  });

  it("rejects a second sheet with the same id", () => {
    const duplicate: ForecastSheet = { id: "monthly", name: "Monthly forecast", build: () => undefined };
    expect(() => registerForecastSheet(duplicate)).toThrow(/duplicate sheet monthly/);
  });
});
