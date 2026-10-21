import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { navigateWorkspace, selectWorkspaceAction } from "./header-helpers";

function toast(page: Page, text: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: text });
}

test("copy, reset, and export announce success", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(toast(page, "Link copied")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/toast_link_copied.png", fullPage: false });

  await selectWorkspaceAction(page, "New forecast");
  const reset = toast(page, "Started a new forecast");
  await expect(reset).toBeVisible();
  await expect(reset.getByRole("button", { name: "Undo" })).toBeVisible();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^CSV\b/ }).click();
  await download;
  await expect(toast(page, "CSV downloaded")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export", exact: true })).toBeEnabled();
});

test("a slow product map keeps a layout skeleton, then the page", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/ProductMapPage.tsx*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await navigateWorkspace(page, "Product map");
  const loading = page.getByRole("status").filter({ hasText: "Loading the product map" });
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await page.screenshot({ path: "/opt/cursor/artifacts/loading_product_map.png", fullPage: false });
  release();
  await expect(page.getByRole("heading", { name: "Product map", exact: true })).toBeVisible();
  await expect(loading).toHaveCount(0);
});

test("a failed route offers recovery", async ({ page }) => {
  await page.route("**/ProductMapPage.tsx*", (route) => route.abort());
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await navigateWorkspace(page, "Product map");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText(/couldn.t load/);
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/error_route.png", fullPage: false });
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  await alert.getByRole("button", { name: "Return to plan" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What does the next year cost?");
});

test("an empty product search explains itself and can be cleared", async ({ page }) => {
  await page.goto("./");
  await navigateWorkspace(page, "Product map");
  await page.getByRole("searchbox", { name: "Search Databricks products" }).fill("zzzz-no-such-product");
  await expect(page.getByRole("heading", { name: "No matching entries" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/empty_product_search.png", fullPage: false });
  await page.getByRole("button", { name: "Reset search" }).click();
  await expect(page.getByRole("heading", { name: "No matching entries" })).toHaveCount(0);
});

test("offline keeps the planner and coming back announces it", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("year-sentence")).toContainText("$170,258");
  await page.context().setOffline(true);
  await expect(page.getByTestId("offline-banner")).toBeVisible();
  await expect(page.getByTestId("year-sentence")).toContainText("$170,258");
  await page.screenshot({ path: "/opt/cursor/artifacts/offline_banner.png", fullPage: false });
  await page.context().setOffline(false);
  await expect(toast(page, "Back online")).toBeVisible();
  await expect(page.getByTestId("offline-banner")).toHaveCount(0);
});

test("keyboard help is a dialog and chart loading is busy until the chart arrives", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/ForecastChart.tsx*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  const chartLoading = page.getByRole("status").filter({ hasText: "Loading chart" });
  await expect(chartLoading).toBeVisible();
  await expect(chartLoading).toHaveAttribute("aria-busy", "true");
  await page.screenshot({ path: "/opt/cursor/artifacts/loading_chart.png", fullPage: false });
  release();
  await expect(page.getByTestId("forecast-chart")).toBeVisible();

  await selectWorkspaceAction(page, "Keyboard shortcuts");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
