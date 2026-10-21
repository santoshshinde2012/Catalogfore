import { expect, test, type Page } from "@playwright/test";
import { chooseOption, expectComboboxValue } from "./combobox";
import { navigateWorkspace } from "./header-helpers";

const rateDetails = (page: Page) => page.getByRole("region", { name: "Unit cost details", exact: true });
const calculator = (page: Page) => page.getByRole("region", { name: "Unit cost calculator", exact: true });

test("returning from a product's costs restores the product-map search and selected entry", async ({ page }) => {
  await page.goto("./?view=products");
  const search = page.getByLabel("Search Databricks products", { exact: true });
  await search.fill("Jobs");
  await page
    .getByRole("region", { name: "Product directory", exact: true })
    .getByRole("button", { name: /^Jobs cluster\b/ })
    .click();
  const details = page.getByRole("region", { name: "Product details", exact: true });
  await details.getByRole("button", { name: "Inspect unit costs", exact: true }).click();
  await expectComboboxValue(page, "Product or service", "jobs_classic");
  const hash = new URL(page.url()).hash;
  await page.goBack();
  await expect(search).toHaveValue("Jobs");
  await expect(details.getByRole("heading", { name: "Jobs cluster", exact: true })).toBeVisible();
  await expect(page.locator("#product-map")).toBeFocused();
  expect(new URL(page.url()).hash).toBe(hash);
});

test("returning to unit costs keeps filters, selected rate and an unapplied quantity", async ({ page }) => {
  await page.goto("./?view=rates&product=sql_classic");
  await chooseOption(page, "Cost component", "sql_vm");
  const directory = page.getByRole("region", { name: "Unit cost directory", exact: true });
  await directory.getByRole("button").filter({ hasText: "$2.64" }).click();
  const selected = await directory.locator("button[aria-pressed='true']").innerText();
  const quantity = calculator(page).getByRole("spinbutton");
  await quantity.fill("737");
  const hash = new URL(page.url()).hash;
  await navigateWorkspace(page, "Plan");
  await navigateWorkspace(page, "Unit costs");
  await expectComboboxValue(page, "Product or service", "sql_classic");
  await expectComboboxValue(page, "Cost component", "sql_vm");
  await expect(directory.locator("button[aria-pressed='true']")).toHaveText(selected, { useInnerText: true });
  await expect(quantity).toHaveValue("737");
  expect(new URL(page.url()).hash).toBe(hash);
  await directory.locator("ul > li > button").first().click();
  await expect(quantity).toHaveValue("100");
  await directory.getByRole("button").filter({ hasText: "$2.64" }).click();
  await expect(quantity).toHaveValue("737");
});

test("edited placements and explicit All filters survive history and reload", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_serverless");
  await chooseOption(page, "Cloud", "azure");
  await chooseOption(page, "Region", "eastus");
  await chooseOption(page, "Edition", "enterprise");
  expect(new URL(page.url()).searchParams.get("rateCloud")).toBe("azure");
  expect(new URL(page.url()).searchParams.get("rateRegion")).toBe("eastus");
  await navigateWorkspace(page, "Plan");
  await page.goBack();
  await expectComboboxValue(page, "Cloud", "azure");
  await expectComboboxValue(page, "Region", "eastus");
  await expectComboboxValue(page, "Edition", "enterprise");
  await page.reload();
  await expectComboboxValue(page, "Cloud", "azure");
  await expectComboboxValue(page, "Region", "eastus");
  await expectComboboxValue(page, "Edition", "enterprise");
  await page.getByRole("button", { name: "Reset all filters", exact: true }).click();
  await page.reload();
  for (const label of ["Product or service", "Cloud", "Region", "Edition"]) {
    await expectComboboxValue(page, label, "");
  }
  expect(new URL(page.url()).searchParams.get("rateCloud")).toBe("all");
});

test("browser Back keeps the original rate placement after changing the plan's cloud", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic");
  const directory = page.getByRole("region", { name: "Unit cost directory", exact: true });
  await directory.locator("ul > li > button").nth(1).click();
  const selected = await directory.locator("button[aria-pressed='true']").innerText();
  const quantity = calculator(page).getByRole("spinbutton");
  await quantity.fill("737");
  expect(new URL(page.url()).searchParams.get("rateCloud")).toBe("aws");
  expect(new URL(page.url()).searchParams.get("rateRegion")).toBe("us-east-1");
  await navigateWorkspace(page, "Plan");
  await page.getByRole("radio", { name: "Azure", exact: true }).click();
  const hash = new URL(page.url()).hash;
  await page.goBack();
  await expectComboboxValue(page, "Cloud", "aws");
  await expectComboboxValue(page, "Region", "us-east-1");
  await expect(directory.locator("button[aria-pressed='true']")).toHaveText(selected, { useInnerText: true });
  await expect(quantity).toHaveValue("737");
  expect(new URL(page.url()).hash).toBe(hash);
  await navigateWorkspace(page, "Plan");
  await expect(page.getByRole("radio", { name: "Azure", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("an explicit product reference replaces an unrelated retained search", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic");
  await page.getByLabel("Search rates and services", { exact: true }).fill("no-such-service");
  await navigateWorkspace(page, "Product map");
  await page.getByLabel("Search Databricks products", { exact: true }).fill("Unity Catalog");
  await page
    .getByRole("region", { name: "Product details", exact: true })
    .getByRole("button", { name: "Inspect unit costs", exact: true })
    .click();
  await expectComboboxValue(page, "Product or service", "unity_catalog");
  await expect(page.getByLabel("Search rates and services", { exact: true })).toHaveValue("");
  await expect(rateDetails(page).getByRole("heading", { name: "Unity Catalog", exact: true })).toBeVisible();
});

test("the quantity calculator presents impact before applying and fits large usage on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./?view=rates&product=jobs_serverless");
  const quantity = calculator(page).getByRole("spinbutton");
  await expect(quantity).toHaveCSS("font-size", "16px");
  expect(await quantity.evaluate((input) => input.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await quantity.fill("1000000000000");
  const apply = calculator(page).getByRole("button", { name: "Add to forecast", exact: true });
  const impact = page.getByRole("region", { name: "Forecast impact", exact: true });
  expect(
    await impact.evaluate((section) => {
      const button = section.parentElement?.querySelector("button:last-of-type");
      return button ? Boolean(section.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
    }),
  ).toBe(true);
  await apply.click();
  await expect(calculator(page).getByRole("button", { name: /^Use my usage/ })).toContainText("1,000,000,000,000");
  expect(await calculator(page).evaluate((section) => section.scrollWidth - section.clientWidth)).toBeLessThanOrEqual(
    1,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
