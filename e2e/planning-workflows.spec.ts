import { expect, test } from "@playwright/test";
import { savedDownload } from "./forecast-helpers";

test("named budget scenarios save, compare, duplicate, and reopen after reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("spinbutton", { name: "Annual budget", exact: true }).fill("200000");
  const baseline = await savedDownload(page);
  await page.getByRole("textbox", { name: "Scenario name" }).fill("Budget baseline");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await page.getByRole("combobox", { name: "Compare scenario" }).selectOption({ label: "Budget baseline" });
  await expect(page.getByTestId("scenario-delta")).toContainText("more than Budget baseline");
  await expect(page.getByTestId("budget-variance")).toContainText("annual budget");
  await expect(page.getByTestId("forecast-chart").locator("path.recharts-line-curve[d]")).toHaveCount(3);
  await page.getByRole("button", { name: "Duplicate Budget baseline", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Budget baseline copy", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Annual budget", exact: true })).toHaveValue("200000");
  await page.getByRole("button", { name: "Open Budget baseline", exact: true }).click();
  expect((await savedDownload(page)).annual).toBe(baseline.annual);
  await page.getByRole("button", { name: "Delete Budget baseline copy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Budget baseline copy", exact: true })).toHaveCount(0);
});

test("dated changes begin in the selected month and survive saved-plan reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "0%", exact: true }).click();
  await page.getByLabel("Forecast start month", { exact: true }).fill("2026-11");
  const before = await savedDownload(page);
  await page.getByText("Plan launches and usage changes", { exact: true }).click();
  await page.getByRole("textbox", { name: "Change name" }).fill("Launch in January");
  await page.getByLabel("Effective month", { exact: true }).fill("2027-01");
  await page.getByRole("spinbutton", { name: "Usage change (%)", exact: true }).fill("50");
  await page.getByRole("button", { name: "Add planned change", exact: true }).click();
  const after = await savedDownload(page);
  expect(after.portfolio.events).toHaveLength(1);
  expect(after.forecast[0].total).toBe(before.forecast[0].total);
  expect(after.forecast[1].total).toBe(before.forecast[1].total);
  expect(after.forecast[2].total).toBeCloseTo(before.forecast[2].total * 1.5, 1);
  expect(after.forecast[11].total).toBeCloseTo(before.forecast[11].total * 1.5, 1);
  await page.reload();
  expect((await savedDownload(page)).forecast).toEqual(after.forecast);
});

test("a partial-only usage file stays reviewable until its month is explicitly chosen", async ({ page }) => {
  await page.goto("./");
  await page.getByText("Use my real usage", { exact: true }).click();
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  await page.getByLabel("Usage CSV", { exact: true }).setInputFiles({
    name: "partial.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `usage_date,sku_name,usage_quantity,usage_unit,list_price\n${month}-01,JOBS_COMPUTE,100,DBU,0.1`,
    ),
  });
  await expect(page.getByRole("heading", { name: "Review usage import" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use this baseline" })).toBeDisabled();
  await page.getByRole("combobox", { name: "Import baseline month" }).selectOption(month);
  await expect(page.getByRole("button", { name: "Use this baseline" })).toBeEnabled();
  await page.getByRole("button", { name: "Use this baseline" }).click();
  expect((await savedDownload(page)).portfolio.usage?.selectedMonth).toBe(month);
});
