import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseOption, expectComboboxValue } from "./combobox";
import { navigateWorkspace, selectTheme } from "./header-helpers";
import { downloadRates, openRateTab } from "./rate-helpers";

test("clearing searches and recovering empty results keep keyboard focus in the search field", async ({ page }) => {
  await page.goto("./?view=products");
  const productSearch = page.getByLabel("Search Databricks products", { exact: true });
  await productSearch.fill("jobs");
  const clear = page.getByRole("button", { name: "Clear search", exact: true });
  await clear.focus();
  await clear.press("Enter");
  await expect(productSearch).toBeFocused();
  await expect(productSearch).toHaveValue("");
  await productSearch.fill("no-such-product-127");
  await page.getByRole("button", { name: "Reset search", exact: true }).click();
  await expect(productSearch).toBeFocused();
  await expect(page.getByRole("heading", { name: "No matching entries", exact: true })).toHaveCount(0);
  await navigateWorkspace(page, "Unit costs");
  const rateSearch = page.getByLabel("Search rates and services", { exact: true });
  await rateSearch.fill("no-such-rate-127");
  await page.getByRole("button", { name: "Show all rates", exact: true }).click();
  await expect(rateSearch).toBeFocused();
  await expect(rateSearch).toHaveValue("");
  await expect(page.getByRole("heading", { name: "No matching unit costs", exact: true })).toHaveCount(0);
});

test("showing more results focuses the first new result and reports the actual remaining count", async ({ page }) => {
  await page.goto("./?view=products");
  const products = page.getByRole("region", { name: "Product directory", exact: true });
  const moreProducts = products.getByRole("button", { name: /^Show 12 more entries/ });
  await moreProducts.focus();
  await moreProducts.press("Enter");
  await expect(products.locator("ul > li > button")).toHaveCount(24);
  await expect(products.locator("ul > li > button").nth(12)).toBeFocused();
  await expect(products.locator("ul > li > button").nth(12)).toBeInViewport();
  await page.goto("./?view=rates&product=jobs_classic");
  const rates = page.getByRole("region", { name: "Unit cost directory", exact: true });
  await rates.getByRole("button", { name: /^Show 12 more/ }).click();
  await expect(rates.locator("ul > li > button").nth(12)).toBeFocused();
  const total = Number((await rates.getByRole("status").innerText()).replace(/\D/g, ""));
  expect(total).toBeGreaterThan(24);
  await rates.getByRole("button", { name: new RegExp(`^Show ${Math.min(12, total - 24)} more`) }).click();
  await expect(rates.locator("ul > li > button")).toHaveCount(Math.min(36, total));
  await expect(rates.locator("ul > li > button").nth(24)).toBeFocused();
});

test("complete catalog downloads retain scope, sorting and pagination after leaving the workspace", async ({
  page,
}) => {
  test.slow();
  await page.goto("./?view=rates&product=jobs_classic");
  await openRateTab(page, "Downloads");
  const status = page.getByRole("region", { name: "Download unit costs", exact: true }).getByRole("status");
  const filteredCount = Number((await status.innerText()).match(/of ([\d,]+) rows/)?.[1].replaceAll(",", ""));
  expect(filteredCount).toBeGreaterThan(0);
  await chooseOption(page, "Download scope", "all");
  await chooseOption(page, "Rows per page", "50");
  const preview = page.getByRole("region", { name: "Unit cost data preview", exact: true });
  const header = preview.getByRole("columnheader", { name: "Product / component", exact: true });
  await header.getByRole("button").click();
  await header.getByRole("button").click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  const visibleIds = () =>
    preview.locator("tbody tr[data-row-id]").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-id")));
  const before = await visibleIds();
  await navigateWorkspace(page, "Plan");
  await page.goBack();
  await expectComboboxValue(page, "Download scope", "all");
  await expectComboboxValue(page, "Rows per page", "50");
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(
    page.getByRole("region", { name: "Download unit costs", exact: true }).getByRole("status"),
  ).toContainText("51–100 of");
  expect(await visibleIds()).toEqual(before);
  const exported = JSON.parse(await downloadRates(page, "JSON")) as { rows: { id: string }[] };
  expect(exported.rows.length).toBeGreaterThan(29_000);
  expect(exported.rows.slice(50, 100).map((row) => row.id)).toEqual(before);
  await chooseOption(page, "Download scope", "filtered");
  await expect(page.getByRole("button", { name: "First page", exact: true })).toBeDisabled();
  await expect(preview.locator("tbody tr[data-row-id]")).toHaveCount(Math.min(filteredCount, 50));
});

test("applied quantities and Undo remain visible and keyboard accessible on a narrow screen in both themes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./?view=rates&product=jobs_serverless");
  const calculator = page.getByRole("region", { name: "Unit cost calculator", exact: true });
  const feedback = page.getByRole("region", { name: "Forecast change", exact: true });
  await expect(calculator).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") await selectTheme(page, theme);
    const before = new URL(page.url()).hash;
    await calculator.getByRole("spinbutton").fill("240");
    await calculator.getByRole("button", { name: "Add to forecast", exact: true }).click();
    await expect(feedback).toBeFocused();
    await expect(feedback).toBeInViewport();
    await expect(feedback.getByRole("button", { name: "Undo change", exact: true })).toBeInViewport();
    await expect(feedback.getByRole("button", { name: "View forecast", exact: true })).toBeInViewport();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await feedback.getByRole("button", { name: "Undo change", exact: true }).click();
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText("Change undone");
    await expect.poll(() => new URL(page.url()).hash).toBe(before);
    await openRateTab(page, "Evidence");
    await expect(feedback).toHaveCount(1);
    await openRateTab(page, "Rates & calculator");
    await expect(feedback).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
