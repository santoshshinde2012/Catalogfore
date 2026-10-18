import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseOptionByName } from "./combobox";
import { navigateWorkspace as navigate, selectTheme } from "./header-helpers";
import { savedDownload } from "./forecast-helpers";

const directory = (page: Page) => page.getByRole("region", { name: "Product directory", exact: true });
const details = (page: Page) => page.getByRole("region", { name: "Product details", exact: true });

function chartWarnings(page: Page) {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" && /chart should be greater than 0/.test(message.text())) {
      warnings.push(message.text());
    }
  });
  return warnings;
}

test("product-map navigation, history and reload preserve the current forecast", async ({ page, isMobile }) => {
  const warnings = chartWarnings(page);
  await page.goto("./?campaign=team");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const annual = await page.getByTestId("year-sentence").innerText();
  const hash = new URL(page.url()).hash;
  await navigate(page, "Product map");
  await expect(page.locator("#product-map")).toBeFocused();
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await expect(skip).toHaveAttribute("href", "#product-map");
  await skip.focus();
  await skip.press("Enter");
  await expect(page.locator("#product-map")).toBeFocused();
  expect(new URL(page.url()).searchParams.get("view")).toBe("products");
  expect(new URL(page.url()).searchParams.get("campaign")).toBe("team");
  expect(new URL(page.url()).hash).toBe(hash);
  await expect(page.getByRole("complementary", { name: "Forecast shortcut" })).toBeHidden();
  if (!isMobile) {
    await expect(page.getByRole("banner").getByRole("button", { name: "Product map", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }

  await page.goBack();
  await expect(page.locator("#plan-inputs")).toBeFocused();
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("year-sentence")).toHaveText(annual);
  expect(new URL(page.url()).hash).toBe(hash);
  await page.goForward();
  await expect(page.locator("#product-map")).toBeVisible();
  await page.reload();
  await expect(page.locator("#product-map")).toBeVisible();
  await navigate(page, "Plan");
  await expect(page.locator("#plan-inputs")).toBeFocused();
  await expect(page.getByTestId("year-sentence")).toHaveText(annual);
  expect(new URL(page.url()).search).toBe("?campaign=team");
  expect(new URL(page.url()).hash).toBe(hash);
  expect(warnings).toEqual([]);
});

test("search explains product aliases and platform entries without inventing an estimate", async ({ page }) => {
  const warnings = chartWarnings(page);
  await page.goto("./?view=products");
  const search = page.getByLabel("Search Databricks products", { exact: true });
  await search.fill("Unity Catalog");
  await directory(page)
    .getByRole("button", { name: /^Unity Catalog\b/ })
    .click();
  await expect(details(page)).toBeFocused();
  await expect(details(page).getByRole("heading", { name: "Unity Catalog", exact: true })).toBeVisible();
  await expect(details(page).getByRole("button", { name: "Add to forecast", exact: true })).toHaveCount(0);
  await expect(details(page).getByRole("link").first()).toHaveAttribute(
    "href",
    /^https:\/\/(?:docs\.|www\.)?databricks\.com\//,
  );
  await details(page).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await details(page)
    .getByRole("button", { name: /^Delta Lake\b/ })
    .click();
  await expect(details(page).getByRole("heading", { name: "Delta Lake", exact: true })).toBeInViewport();
  expect(await details(page).evaluate((element) => element.scrollTop)).toBe(0);
  await search.fill("DLT");
  await expect(
    directory(page)
      .getByRole("button", { name: /^Lakeflow pipelines\b/ })
      .first(),
  ).toBeVisible();
  await search.fill("no-such-databricks-product-xyz");
  await expect(directory(page).locator("ul > li > button")).toHaveCount(0);
  await expect(directory(page).getByRole("heading", { name: "No matching entries", exact: true })).toBeVisible();
  expect(warnings).toEqual([]);
});

test("domain and entry filters remain accessible on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("./?view=products");
  await expect(page.locator("#product-map")).toBeVisible();
  const domains = page.getByRole("combobox", { name: "Filter by domain", exact: true });
  await domains.click();
  const options = (await page.getByRole("option").allTextContents()).map((option) => option.trim());
  await page.keyboard.press("Escape");
  expect(options.length).toBeGreaterThan(4);
  const domainButton = page
    .getByRole("group", { name: "Product domains", exact: true })
    .getByRole("button", { name: new RegExp(`^${options[1]}\\b`) });
  await domainButton.focus();
  await domainButton.press("Enter");
  await expect(domainButton).toHaveAttribute("aria-pressed", "true");
  await expect(domains).toContainText(options[1]);
  await expect(directory(page).locator("ul > li > button").first()).toBeVisible();
  await chooseOptionByName(page, "Filter by domain", "All domains");
  await chooseOptionByName(page, "Filter by entry type", "Platform concepts");
  await expect(directory(page).locator("ul > li > button").first()).toBeVisible();
  await directory(page).locator("ul > li > button").first().click();
  await expect(details(page)).toBeFocused();
  await expect(details(page).getByRole("button", { name: "Add to forecast", exact: true })).toHaveCount(0);
  await details(page).getByRole("button", { name: "Back to results", exact: true }).click();
  await expect(directory(page)).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  await selectTheme(page, "dark");
  const darkScan = await new AxeBuilder({ page }).analyze();
  expect(darkScan.violations).toEqual([]);
});

test("adding a catalog product preserves cloud, budget and workloads and supports Undo", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "Azure", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Annual budget", exact: true }).fill("250000");
  const before = await savedDownload(page);
  await navigate(page, "Product map");
  await page.getByLabel("Search Databricks products", { exact: true }).fill("Lakeflow Jobs (classic)");
  await directory(page)
    .getByRole("button", { name: /^Jobs cluster\b/ })
    .click();
  await details(page).getByRole("button", { name: "Add to forecast", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Advanced", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  const after = await savedDownload(page);
  expect(after.portfolio.cloud).toBe("azure");
  expect(after.portfolio.budgetAnnual).toBe(250000);
  expect(after.portfolio.workloads.length).toBeGreaterThan(before.portfolio.workloads.length);
  expect(after.portfolio.workloads.slice(0, before.portfolio.workloads.length)).toEqual(before.portfolio.workloads);
  const currentHash = new URL(page.url()).hash;
  await page.goBack();
  await expect(page.locator("#product-map")).toBeVisible();
  expect(new URL(page.url()).hash).toBe(currentHash);
  await navigate(page, "Plan");
  await page.getByRole("button", { name: "Undo last change", exact: true }).click();
  const restored = await savedDownload(page);
  expect(restored.portfolio).toEqual(before.portfolio);
  expect(restored.annual).toBe(before.annual);
});

test("browser Back closes Advanced while preserving the product added to the current plan", async ({ page }) => {
  const warnings = chartWarnings(page);
  await page.goto("./");
  const before = await savedDownload(page);
  await navigate(page, "Product map");
  await page.getByLabel("Search Databricks products", { exact: true }).fill("Lakeflow Jobs (classic)");
  await directory(page)
    .getByRole("button", { name: /^Jobs cluster\b/ })
    .click();
  await details(page).getByRole("button", { name: "Add to forecast", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Advanced", exact: true })).toBeVisible();
  const currentHash = new URL(page.url()).hash;
  await page.goBack();
  await expect(page.locator("#product-map")).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe(currentHash);
  await navigate(page, "Plan");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const after = await savedDownload(page);
  expect(after.portfolio.workloads.length).toBeGreaterThan(before.portfolio.workloads.length);
  expect(after.portfolio.workloads.slice(0, before.portfolio.workloads.length)).toEqual(before.portfolio.workloads);
  await page.getByRole("button", { name: "Undo last change", exact: true }).click();
  expect((await savedDownload(page)).portfolio).toEqual(before.portfolio);
  expect(warnings).toEqual([]);
});
