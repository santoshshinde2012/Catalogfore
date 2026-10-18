import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";
import { expect, test, type Page } from "@playwright/test";
import { chooseOption } from "./combobox";
import { downloadRates, openRateTab } from "./rate-helpers";

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 10 });
const comparison = (page: Page) => page.getByRole("region", { name: "Regional unit cost comparison", exact: true });
const details = (page: Page) => page.getByRole("region", { name: "Unit cost details", exact: true });
async function currentRows(page: Page) {
  return JSON.parse(await downloadRates(page, "JSON")) as UnitCostCatalog;
}

test("regional bars, calculation path, and downloads share the same dimensional quote", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic&rateCloud=azure&rateRegion=eastus&rateTier=premium");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const before = new URL(page.url()).hash;
  const initial = await currentRows(page);
  const selected = initial.rows[0];
  const path = details(page).getByRole("region", { name: "Unit cost calculation path", exact: true });
  await expect(path).toContainText("Source price");
  await expect(path).toContainText("Consumption for quoted quantity");
  await expect(path).toContainText("Component quote");
  await expect(path).toContainText(money(selected.unitPriceUsd!));
  await expect(path).toContainText(money(selected.baseRateUsd!));
  await openRateTab(page, "Compare regions");
  const chart = comparison(page);
  await expect(chart.getByRole("heading", { name: "Compare the same unit", exact: true })).toBeVisible();
  await expect(chart).toContainText(selected.instanceId!);
  await expect(chart).toContainText("USD / node-hour");
  const selectedBar = chart.locator('button[aria-pressed="true"]');
  await expect(selectedBar).toContainText(money(selected.unitPriceUsd!));
  await expect(selectedBar).toContainText(selected.regionLabel!);
  const target = chart.locator('button[aria-pressed="false"]').first();
  const targetLabel = await target.locator("span.break-words").innerText();
  await target.focus();
  await target.press("Enter");
  await expect(details(page)).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toContainText(targetLabel);
  const after = await currentRows(page);
  const sameConfiguration = after.rows.find(
    (row) =>
      row.componentId === selected.componentId &&
      row.instanceId === selected.instanceId &&
      row.variant === selected.variant,
  );
  expect(sameConfiguration).toBeDefined();
  expect(sameConfiguration!.region).not.toBe(selected.region);
  await expect(details(page)).toContainText(sameConfiguration!.instanceId!);
  await openRateTab(page, "Compare regions");
  await expect(chart.locator('button[aria-pressed="true"]')).toContainText(money(sameConfiguration!.unitPriceUsd!));
  expect(new URL(page.url()).hash).toBe(before);
});

test("comparison keeps SQL sizes separate and never charts unresolved context as a zero price", async ({ page }) => {
  await page.goto("./?view=rates&product=sql_classic&rateCloud=azure&rateRegion=eastus&rateTier=premium");
  await chooseOption(page, "Cost component", "compute");
  const rows = (await currentRows(page)).rows;
  const selected = rows[0];
  await openRateTab(page, "Compare regions");
  await expect(comparison(page)).toContainText(String(selected.dimensions.size));
  await expect(comparison(page)).toContainText(`USD / ${selected.unit}`);
  await expect(comparison(page).locator('button[aria-pressed="true"]')).toContainText(money(selected.unitPriceUsd!));
  await chooseOption(page, "Product or service", "unity_catalog");
  await expect(comparison(page)).toContainText("No monetary comparison");
  await expect(comparison(page).locator("ol")).toHaveCount(0);
  await expect(comparison(page).getByRole("status")).toContainText("no resolved monetary quote");
  await openRateTab(page, "Evidence");
  await expect(page.getByRole("region", { name: "Evidence coverage", exact: true })).toContainText(
    "Evidence coverage, not a breakdown of spending",
  );
  await openRateTab(page, "Rates & calculator");
  await expect(
    details(page).getByRole("region", { name: "Unit cost calculation path", exact: true }).locator("ol"),
  ).toHaveCount(0);
});
