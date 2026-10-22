import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { selectTheme } from "./header-helpers";

test("theme boot loads with the site base path", async ({ page }) => {
  let bootStatus: number | undefined;
  page.on("response", (response) => {
    if (response.url().includes("theme-boot.js")) bootStatus = response.status();
  });
  await page.goto("./");
  const externalBoot = page.locator("script[src*='theme-boot.js']");
  if (await externalBoot.count()) {
    expect(bootStatus).toBe(200);
    expect(await externalBoot.getAttribute("src")).toContain("/Catalogfore/theme-boot.js");
  } else {
    // Production inlines the same boot script under the generated CSP.
    expect(await page.locator("script:not([src])").allTextContents()).toContainEqual(
      expect.stringContaining('var key = "cayfore-theme"'),
    );
  }
});

test("the four quick inputs and the chart are reachable without hunting", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("./");
  await expect(page.getByRole("radiogroup", { name: "Edition", exact: true })).toBeVisible();
  const spend = page.getByRole("textbox", { name: "Starting monthly spend", exact: true });
  await expect(spend).toBeInViewport();
  await expect(page.getByTestId("first-month")).toHaveText("$11,996.70");
  await expect(page.getByTestId("month-twelve")).toHaveText("$16,606.23");
  await expect(page.getByTestId("year-sentence")).toContainText("About $170,258 per year.");
  const chart = page.getByTestId("forecast-chart");
  await expect(chart).toBeInViewport({ ratio: 0.95 });
  const advanced = page.getByRole("button", { name: "Advanced", exact: true });
  expect((await advanced.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("domain names and rate filters stay readable on a phone and a tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("./?view=products");
  const domain = page.getByRole("button", { name: /^Platform & infrastructure\b/ });
  await expect(domain).toBeVisible();
  const clipped = await domain
    .locator("span.font-semibold")
    .evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(clipped).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("./?view=rates");
  const region = page.getByRole("combobox", { name: "Region", exact: true });
  await expect(region).toContainText("US East (N. Virginia)");
  const truncated = await region
    .locator("span.truncate")
    .evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(truncated).toBeLessThanOrEqual(1);
  await page.getByRole("tab", { name: "Downloads", exact: true }).click();
  const productHeader = page.getByRole("columnheader", { name: "Product / component", exact: true });
  await expect(productHeader).toBeVisible();
  expect(await productHeader.evaluate((element) => getComputedStyle(element).position)).toBe("sticky");

  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);
  await selectTheme(page, "dark");
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);
});
