import { expect, test, type Page } from "@playwright/test";
import { chooseOption, expectComboboxValue } from "./combobox";
import { downloadRates as download, openRateTab, showRateRefinements } from "./rate-helpers";
import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";

const details = (page: Page) => page.getByRole("region", { name: "Unit cost details", exact: true });
const quote = (page: Page) => details(page).getByRole("group", { name: "Unit price and evidence", exact: true });
test("official numeric prices and planning estimates remain distinct from official background documentation", async ({
  page,
}) => {
  await page.goto("./?view=rates&product=jobs_serverless&rateCloud=azure&rateRegion=eastus&rateTier=premium");
  await showRateRefinements(page);
  await chooseOption(page, "Evidence basis", "official");
  await expect(quote(page).getByText("Official list price", { exact: true })).toBeVisible();
  await expect(details(page)).toContainText("Official publisher");
  await expect(details(page)).toContainText("Price evidence");
  await expect(details(page)).toContainText("Snapshot observed");
  await expect(details(page)).toContainText("Source reviewed");
  const rates = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(rates.rows.length).toBeGreaterThan(0);
  expect(rates.rows.every((row) => row.evidenceLevel === "official")).toBe(true);
  expect(
    rates.rows.every((row) =>
      row.sources.some((source) => source.role === "price" && source.authority === "first_party"),
    ),
  ).toBe(true);
  await openRateTab(page, "Evidence");
  const coverage = page.getByRole("region", { name: "Evidence coverage", exact: true });
  await expect(coverage).toContainText(rates.rows.length.toLocaleString("en-US"));
  await coverage.getByText("How to read the sources", { exact: true }).click();
  await expect(coverage).toContainText(
    "An official documentation link can explain a service without establishing its numeric price",
  );

  await chooseOption(page, "Evidence basis", "estimate");
  await chooseOption(page, "Product or service", "jobs_classic");
  await chooseOption(page, "Cost component", "compute");
  await openRateTab(page, "Rates & calculator");
  await expect(quote(page).getByText("Planning estimate", { exact: true })).toBeVisible();
  await expect(details(page)).toContainText("Official publisher");
  await expect(details(page)).toContainText("Consumption rule");
  await expect(details(page).getByText("Official list price", { exact: true })).toHaveCount(0);
  const estimated = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(estimated.rows.length).toBeGreaterThan(0);
  expect(estimated.rows.every((row) => row.evidenceLevel === "estimate")).toBe(true);
});

test("conflicting official sources suppress the price and quantity calculator", async ({ page }) => {
  await page.goto("./?view=rates&product=foundation_provisioned&rateCloud=azure&rateRegion=eastus&rateTier=premium");
  await page.getByRole("searchbox", { name: "Search rates and services", exact: true }).fill("gte");
  await showRateRefinements(page);
  await chooseOption(page, "Evidence basis", "unresolved");
  await expect(details(page).getByText("Unresolved", { exact: true })).toBeVisible();
  await expect(details(page)).toContainText("Rate unavailable");
  await expect(details(page)).toContainText("Official publisher");
  await expect(details(page).getByRole("spinbutton")).toHaveCount(0);
  const rates = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(rates.rows.length).toBeGreaterThan(0);
  expect(rates.rows.every((row) => row.confidence === "conflict" && row.unitPriceUsd === null)).toBe(true);
});

test("a regional first-party price conflict exposes both exact observations and preserves the forecast on Back", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const annual = await page.getByTestId("year-sentence").innerText();
  const hash = new URL(page.url()).hash;
  await page.goto(
    `./?view=rates&product=jobs_serverless&rateCloud=gcp&rateRegion=europe-west1&rateTier=enterprise${hash}`,
  );
  await expectComboboxValue(page, "Cloud", "gcp");
  await expectComboboxValue(page, "Region", "europe-west1");
  await expectComboboxValue(page, "Edition", "enterprise");
  await expect(details(page).getByText("Unresolved", { exact: true })).toBeVisible();
  await expect(details(page)).toContainText("Rate unavailable");
  await expect(details(page)).toContainText("0.5 versus 0.39");
  await expect(details(page).getByRole("spinbutton")).toHaveCount(0);
  for (const [file, locator] of [
    ["cards.json", "JSON pointer /enterprise/GCP/jobs_serverless/Europe (Belgium); USD 0.5/DBU"],
    ["GCP.json", "Source row 3108 (zero-based); USD 0.39/DBU"],
  ]) {
    const url = `https://www.databricks.com/en-pricing-assets/data/pricing/${file}`;
    const source = details(page)
      .locator("li")
      .filter({ has: page.locator(`a[href="${url}"]`) });
    await expect(source).toHaveCount(1);
    await expect(source).toContainText("Official publisher");
    await expect(source).toContainText(locator);
    await expect(source.getByRole("link")).toHaveAttribute("href", url);
  }
  const rates = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(rates.rows).toHaveLength(1);
  expect(rates.rows[0]).toMatchObject({ confidence: "conflict", evidenceLevel: "unresolved", unitPriceUsd: null });
  expect(new URL(page.url()).hash).toBe(hash);
  await page.getByRole("button", { name: "Back to planner", exact: true }).click();
  await expect(page.getByTestId("year-sentence")).toHaveText(annual);
  expect(new URL(page.url()).hash).toBe(hash);
  await page.goBack();
  await expectComboboxValue(page, "Region", "europe-west1");
  await expect(details(page)).toContainText("Rate unavailable");
  expect(new URL(page.url()).hash).toBe(hash);
});
