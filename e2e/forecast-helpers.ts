import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import type { Portfolio, SimpleMonth, ForecastPoint } from "../packages/engine/src/index";

export interface SavedDownload {
  portfolio: Portfolio;
  annual: number;
  forecast: ForecastPoint[];
  months: SimpleMonth[];
}
export async function exportText(page: Page, format: "JSON" | "CSV"): Promise<string> {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: format, exact: true }).click();
  const path = await (await pending).path();
  if (!path) throw new Error("Download file is unavailable");
  return readFile(path, "utf8");
}
export async function savedDownload(page: Page): Promise<SavedDownload> {
  return JSON.parse(await exportText(page, "JSON")) as SavedDownload;
}
export async function uploadUsage(page: Page, csv: string) {
  await page.getByText("Use my real usage", { exact: true }).click();
  await page
    .getByLabel("Usage CSV", { exact: true })
    .setInputFiles({ name: "usage.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByRole("heading", { name: "Review usage import" })).toBeVisible();
}
export async function readTable(page: Page): Promise<{ low: number; expected: number; high: number }[]> {
  await page.getByRole("tab", { name: "Months", exact: true }).click();
  return page
    .getByRole("table", { name: "Month by month, low, expected, and high" })
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => {
        const cells = [...row.querySelectorAll("td")].map((cell) => Number(cell.textContent?.replace(/[^\d.-]/g, "")));
        return { low: cells[0], expected: cells[1], high: cells[2] };
      }),
    );
}
