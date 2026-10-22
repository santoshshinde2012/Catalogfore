import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { savedDownload } from "./forecast-helpers";

const MONTHS = 12;
const FIRST_MONTH_ROW = 2;

test("the Excel workbook matches the on-screen forecast", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("year-sentence")).toContainText(
    /About \$170,258 per year\. Planning range \$144,719 to \$204,309/,
  );
  const saved = await savedDownload(page);
  expect(saved.annual).toBeCloseTo(170257.52, 2);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^XLSX\b/ }).click();
  const path = await (await pending).path();
  if (!path) throw new Error("Workbook download is unavailable");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const monthly = workbook.getWorksheet("Monthly forecast");
  const summary = workbook.getWorksheet("Summary");
  if (!monthly || !summary) throw new Error("Workbook is missing a forecast sheet");

  const bases = Array.from({ length: MONTHS }, (_, index) => monthly.getCell(index + FIRST_MONTH_ROW, 3).value);
  expect(bases).toEqual(saved.months.map((month) => month.expected));
  expect(summary.getCell("B3").value).toBe("AWS");
  expect(summary.getCell("B9").value).toEqual({
    formula: "SUM('Monthly forecast'!C2:C13)",
    result: saved.annual,
  });
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  expect(summary.getCell("B12").value).toBe(catalog.version);
  await expect(page.getByTestId("year-sentence")).toContainText(
    /About \$170,258 per year\. Planning range \$144,719 to \$204,309/,
  );
});
