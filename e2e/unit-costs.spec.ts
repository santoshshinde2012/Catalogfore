import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";

const directory = (page: Page) => page.getByRole("region", { name: "Unit cost directory", exact: true });
const details = (page: Page) => page.getByRole("region", { name: "Unit cost details", exact: true });
async function navigate(page: Page, name: "Unit costs" | "Product map" | "Plan", mobile: boolean) {
  const header = page.getByRole("banner");
  if (mobile) {
    await header.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("menuitem", { name: new RegExp(`^${name === "Plan" ? "Edit inputs" : name}\\b`) }).click();
  } else await header.getByRole("button", { name, exact: true }).click();
}
async function download(page: Page, format: "CSV" | "JSON") {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("region", { name: "Download unit costs", exact: true })
    .getByRole("button", { name: format, exact: true })
    .click();
  const result = await pending;
  return readFile((await result.path())!, "utf8");
}

test("unit-cost navigation, product links, history, and reload preserve the active forecast", async ({
  page,
  isMobile,
}) => {
  await page.goto("./?campaign=team");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const annual = await page.getByTestId("year-sentence").innerText();
  const hash = new URL(page.url()).hash;
  await navigate(page, "Unit costs", isMobile);
  await expect(page.locator("#unit-costs")).toBeFocused();
  expect(new URL(page.url()).searchParams.get("campaign")).toBe("team");
  expect(new URL(page.url()).hash).toBe(hash);
  await expect(page.getByRole("link", { name: "Skip to content", exact: true })).toHaveAttribute("href", "#unit-costs");
  await page.getByRole("combobox", { name: "Product or service", exact: true }).selectOption("jobs_classic");
  expect(new URL(page.url()).searchParams.get("product")).toBe("jobs_classic");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Product or service", exact: true })).toHaveValue("jobs_classic");
  await navigate(page, "Plan", isMobile);
  await expect(page.getByTestId("year-sentence")).toHaveText(annual);
  expect(new URL(page.url()).hash).toBe(hash);
  await page.goBack();
  await expect(page.locator("#unit-costs")).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Product or service", exact: true })).toHaveValue("jobs_classic");
  await navigate(page, "Product map", isMobile);
  await page.getByLabel("Search Databricks products", { exact: true }).fill("Jobs cluster");
  await page
    .getByRole("region", { name: "Product details", exact: true })
    .getByRole("button", { name: "Inspect unit costs", exact: true })
    .click();
  await expect(page.locator("#unit-costs")).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Product or service", exact: true })).toHaveValue("jobs_classic");
  expect(new URL(page.url()).hash).toBe(hash);
});

test("CSV and JSON downloads retain the same filtered dimensions and complete catalog scope", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic");
  const filtered = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(filtered.rows.length).toBeGreaterThan(0);
  expect(filtered.products.map((product) => product.id)).toEqual(["jobs_classic"]);
  expect(filtered.rows.every((row) => row.productId === "jobs_classic")).toBe(true);
  const csv = await download(page, "CSV");
  expect(csv.split("\r\n")[0]).toContain("unitPriceUsd,usdPerUnit");
  for (const row of filtered.rows) expect(csv).toContain(row.id);
  await expect(directory(page).getByRole("status")).toHaveText(
    `${filtered.rows.length.toLocaleString("en-US")} matching ${filtered.rows.length === 1 ? "row" : "rows"}`,
  );
  await page.getByRole("combobox", { name: "Download scope", exact: true }).selectOption("all");
  const full = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(full.products.length).toBeGreaterThan(70);
  expect(full.rows.length).toBeGreaterThan(filtered.rows.length);
  expect(full.rows.some((row) => row.unitPriceUsd === null)).toBe(true);
  expect(full.rows.every((row) => row.sources.length > 0)).toBe(true);
});

test("a source rate calculates a component cost without changing the forecast", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_classic");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const catalog = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  const row = catalog.rows[0];
  expect(row.rateKind).toBe("money");
  expect(row.usdPerUnit).not.toBeNull();
  const before = new URL(page.url()).hash;
  const quantity = page.getByRole("region", { name: "Unit cost calculator", exact: true }).getByRole("spinbutton");
  await quantity.fill("200");
  const dollars = (200 * row.usdPerUnit!).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 10,
  });
  await expect(page.locator("#rate-calculation")).toContainText(`= ${dollars}`);
  await quantity.fill("-1");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#rate-calculation")).toContainText("billable quantity");
  await expect(details(page).getByRole("link").first()).toHaveAttribute("href", /^https:\/\//);
  expect(new URL(page.url()).hash).toBe(before);
});

test("SQL infrastructure distinguishes its DBU base from the warehouse-hour price", async ({ page }) => {
  await page.goto("./?view=rates&product=sql_classic");
  await page.getByRole("combobox", { name: "Cost component", exact: true }).selectOption("sql_vm");
  await directory(page).getByRole("button").filter({ hasText: "$2.64" }).click();
  await expect(details(page).getByText("$2.64", { exact: true })).toBeVisible();
  await expect(details(page).getByText("per warehouse-hour", { exact: true })).toBeVisible();
  await expect(details(page).getByText("$0.22 / DBU infrastructure-equivalent", { exact: true })).toBeVisible();
  await expect(details(page).getByText("Warehouse DBUs / hour", { exact: true })).toBeVisible();
  await page.getByRole("spinbutton", { name: "Billable quantity (warehouse-hour)", exact: true }).fill("10");
  await expect(page.locator("#rate-calculation")).toContainText("= $26.40");
});

test("Search storage calculator requests units after the included storage allowance", async ({ page }) => {
  await page.goto("./?view=rates&product=vector_search_standard");
  await page.getByRole("combobox", { name: "Cost component", exact: true }).selectOption("storage");
  await expect(details(page)).toContainText("max(0, stored GB − 30 included GB)");
  const quantity = page.getByRole("spinbutton", { name: "Billable quantity (GB-month)", exact: true });
  await expect(quantity).toHaveAccessibleDescription(
    /Enter units after applicable allowances and consumption adjustments/,
  );
  await quantity.fill("0");
  await expect(page.locator("#rate-calculation")).toContainText("= $0.00");
  await quantity.fill("30");
  await expect(page.locator("#rate-calculation")).toContainText("= $6.90");
});

test("unresolved and concept rows remain visible for the selected placement without a zero price", async ({ page }) => {
  await page.goto("./?view=rates&product=unity_catalog");
  await expect(details(page).getByRole("heading", { name: "Unity Catalog", exact: true })).toBeVisible();
  await expect(details(page)).toContainText("No standalone rate");
  await expect(details(page).getByRole("spinbutton")).toHaveCount(0);
  const rows = JSON.parse(await download(page, "JSON")) as UnitCostCatalog;
  expect(rows.rows.length).toBeGreaterThan(0);
  expect(rows.rows.every((row) => row.unitPriceUsd === null)).toBe(true);
  await page.getByRole("combobox", { name: "Product or service", exact: true }).selectOption("delta_sharing");
  await expect(details(page)).toContainText("Rate unavailable");
  await expect(details(page)).toContainText("unresolved, not a free service");
  await expect(details(page).getByRole("spinbutton")).toHaveCount(0);
});

test("rate filters, keyboard details, and light/dark layouts fit narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./?view=rates");
  await page.getByRole("combobox", { name: "Cloud", exact: true }).selectOption("azure");
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toHaveValue("");
  await page.getByRole("combobox", { name: "Product or service", exact: true }).selectOption("jobs_classic");
  const first = directory(page).locator("ul > li > button").first();
  await first.focus();
  await first.press("Enter");
  await expect(details(page)).toBeFocused();
  await details(page).getByRole("button", { name: "Back to rates", exact: true }).click();
  await expect(directory(page)).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
