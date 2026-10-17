import AxeBuilder from "@axe-core/playwright";
import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";
import { expect, test, type Page } from "@playwright/test";
import { selectTheme } from "./header-helpers";
import { downloadRates, openRateTab } from "./rate-helpers";

const downloads = (page: Page) => page.getByRole("region", { name: "Download unit costs", exact: true });
const preview = (page: Page) => page.getByRole("region", { name: "Unit cost data preview", exact: true });
const dataRows = (page: Page) => preview(page).locator("tbody tr[data-row-id]");
const scope = (page: Page) => page.getByRole("combobox", { name: "Download scope", exact: true });
const size = (page: Page) => page.getByRole("combobox", { name: "Rows per page", exact: true });
const search = (page: Page) => page.getByRole("searchbox", { name: "Search rates and services", exact: true });
const pageButton = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Catalog preview pagination", exact: true })
    .getByRole("button", { name, exact: true });
const ids = (page: Page) => dataRows(page).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-id")));
const json = async (page: Page) => JSON.parse(await downloadRates(page, "JSON")) as UnitCostCatalog;

test("the preview and complete filtered exports share numeric sorting and canonical row order", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic");
  await openRateTab(page, "Downloads");
  const original = await json(page);
  await size(page).selectOption("100");
  const header = preview(page).getByRole("columnheader", { name: "Quoted rate", exact: true });
  const sort = header.getByRole("button", { name: "Quoted rate", exact: true });
  await sort.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  const ascending = await json(page);
  const quotes = ascending.rows.filter((row) => row.rateKind === "money" && row.unitPriceUsd !== null);
  expect(quotes.length).toBeGreaterThan(1);
  expect(ascending.rows.length).toBeGreaterThan(quotes.length);
  expect(ascending.rows.slice(0, quotes.length)).toEqual(quotes);
  const values = quotes.map((row) => row.unitPriceUsd!);
  expect(values).toEqual([...values].sort((a, b) => a - b));
  expect(await ids(page)).toEqual(ascending.rows.slice(0, 100).map((row) => row.id));
  const csv = await downloadRates(page, "CSV");
  expect(csv.split("\r\n")[0].split(",")).toHaveLength(40);
  const positions = ascending.rows.map((row) => csv.indexOf(`\r\n${row.id},`));
  expect(positions.every((position) => position > 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  await sort.click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  const descending = await json(page);
  expect(descending.rows.slice(0, quotes.length).map((row) => row.unitPriceUsd)).toEqual([...values].reverse());
  expect(descending.rows.slice(quotes.length).every((row) => row.unitPriceUsd === null)).toBe(true);
  await sort.click();
  await expect(header).toHaveAttribute("aria-sort", "none");
  expect(await ids(page)).toEqual(original.rows.slice(0, 100).map((row) => row.id));
});

test("pagination limits rendering while full exports and empty filtered exports retain their scope", async ({
  page,
}) => {
  test.slow();
  await page.goto("./?view=rates&product=jobs_classic");
  await openRateTab(page, "Downloads");
  await scope(page).selectOption("all");
  await expect(dataRows(page)).toHaveCount(25);
  await expect(pageButton(page, "Previous page")).toBeDisabled();
  await size(page).selectOption("50");
  await pageButton(page, "Next page").click();
  await expect(downloads(page).getByRole("status")).toContainText("51–100 of");
  await preview(page).evaluate((element) => {
    element.scrollTop = 400;
  });
  expect(await preview(page).evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await pageButton(page, "Last page").click();
  await expect.poll(() => preview(page).evaluate((element) => element.scrollTop)).toBe(0);
  const full = await json(page);
  expect(full.rows.length).toBeGreaterThan(29_000);
  const start = Math.floor((full.rows.length - 1) / 50) * 50;
  expect(await ids(page)).toEqual(full.rows.slice(start).map((row) => row.id));
  await expect(pageButton(page, "Next page")).toBeDisabled();
  await expect(pageButton(page, "Last page")).toBeDisabled();
  await search(page).fill("no matching catalog entry 937164");
  expect(await ids(page)).toEqual(full.rows.slice(start).map((row) => row.id));
  await scope(page).selectOption("filtered");
  await expect(dataRows(page)).toHaveCount(0);
  await expect(preview(page)).toContainText("No rows match these filters");
  await preview(page).scrollIntoViewIfNeeded();
  await expect(preview(page).getByText("No rows match these filters", { exact: true })).toBeInViewport();
  await expect(downloads(page).getByRole("status")).toHaveText("0 of 0 rows");
  await expect(pageButton(page, "Next page")).toBeDisabled();
  const empty = await json(page);
  expect(empty.rows).toEqual([]);
  expect(empty.products).toEqual([]);
  expect((await downloadRates(page, "CSV")).split("\r\n")).toHaveLength(2);
  await search(page).clear();
  await expect(downloads(page).getByRole("status")).toContainText("1–");
  await expect(pageButton(page, "First page")).toBeDisabled();
});

test("inspecting a complete-catalog row reveals its exact quote beyond the current filters", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const hash = new URL(page.url()).hash;
  await search(page).fill("m5.xlarge");
  await openRateTab(page, "Downloads");
  await scope(page).selectOption("all");
  await pageButton(page, "Last page").click();
  const row = dataRows(page).first();
  const id = await row.getAttribute("data-row-id");
  const inspect = row.getByRole("button");
  const product = (await inspect.innerText()).trim();
  expect(product).not.toBe("Jobs cluster");
  await inspect.click();
  const details = page.getByRole("region", { name: "Unit cost details", exact: true });
  await expect(details).toBeFocused();
  await expect(details.getByRole("heading", { name: product, exact: true })).toBeVisible();
  await expect(search(page)).toHaveValue("");
  expect(new URL(page.url()).hash).toBe(hash);
  await openRateTab(page, "Downloads");
  await expect(scope(page)).toHaveValue("all");
  expect((await ids(page))[0]).toBe(id);
  await scope(page).selectOption("filtered");
  const inspected = (await json(page)).rows.find((entry) => entry.id === id);
  expect(inspected).toBeDefined();
  await openRateTab(page, "Rates & calculator");
  await expect(details).toContainText(inspected!.componentName);
  await expect(page.getByRole("combobox", { name: "Cloud", exact: true })).toHaveValue(inspected!.cloud ?? "");
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toHaveValue(inspected!.region ?? "");
  await expect(page.getByRole("combobox", { name: "Edition", exact: true })).toHaveValue(inspected!.tier ?? "");
  expect(new URL(page.url()).hash).toBe(hash);
});

test("the table retains million-token price bases and distinguishes nonmonetary and unavailable rows", async ({
  page,
}) => {
  await page.goto("./?view=rates&product=fm_llama4_maverick&rateCloud=azure&rateRegion=eastus&rateTier=premium");
  await page.getByRole("combobox", { name: "Cost component", exact: true }).selectOption("input");
  await openRateTab(page, "Downloads");
  const token = (await json(page)).rows[0];
  expect(token.unitQuantity).toBe(1_000_000);
  expect(token.usdPerUnit).toBeGreaterThan(0);
  expect(token.usdPerUnit).toBeLessThan(0.01);
  await expect(dataRows(page).first().locator("td").nth(4)).toHaveText("1,000,000 token");
  const price = await dataRows(page).first().locator("td").nth(3).locator("span").first().innerText();
  expect(Number(price.replace(/[$,]/g, ""))).toBeCloseTo(token.unitPriceUsd!, 8);
  await page.getByRole("combobox", { name: "Product or service", exact: true }).selectOption("vector_search_standard");
  await page.getByRole("combobox", { name: "Cost component", exact: true }).selectOption("storage_allowance");
  await expect(dataRows(page).first().locator("td").nth(3)).toHaveText("30Conditional");
  await expect(dataRows(page).first().locator("td").nth(4)).toHaveText("GB");
  await page.getByRole("combobox", { name: "Product or service", exact: true }).selectOption("unity_catalog");
  await expect(dataRows(page).first().locator("td").nth(3)).toContainText("Workload dependent");
  await page.getByRole("combobox", { name: "Product or service", exact: true }).selectOption("foundation_provisioned");
  await search(page).fill("gte");
  await expect(dataRows(page)).toHaveCount(1);
  await expect(dataRows(page).first().locator("td").nth(3)).toContainText("Rate unavailable");
  await expect(dataRows(page).first().locator("td").nth(3)).not.toContainText("$0.00");
  expect((await json(page)).rows[0].unitPriceUsd).toBeNull();
});

test("a narrow data preview scrolls by keyboard without page overflow in either theme", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./?view=rates&product=jobs_classic");
  await openRateTab(page, "Downloads");
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") await selectTheme(page, theme);
    const region = preview(page);
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    await expect(region).toBeFocused();
    expect(await region.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
    await region.evaluate((element) => {
      element.scrollLeft = 0;
    });
    await region.press("ArrowRight");
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const source = dataRows(page).first().getByRole("link");
    await source.focus();
    await expect(source).toBeInViewport();
    await expect(source).toHaveAttribute("href", /^https:\/\//);
    await expect(source).toHaveAttribute("target", "_blank");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
