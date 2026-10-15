import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function startFromTemplate(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: /Small analytics team/ }).click();
  await expect(page.getByLabel("Forecast name")).toHaveValue("Small analytics team");
  await expect(page.getByTestId("monthly-total")).not.toHaveText("$0.00");
}

test("template, edit, and live total", async ({ page }) => {
  await startFromTemplate(page);
  const before = await page.getByTestId("monthly-total").innerText();
  await page.getByRole("button", { name: /Nightly transforms/ }).click();
  const hours = page.getByLabel("Hours / day");
  await hours.fill("12");
  await expect(page.getByTestId("monthly-total")).not.toHaveText(before);
});

test("share link restores the forecast name", async ({ page }) => {
  await startFromTemplate(page);
  await page.getByLabel("Forecast name").fill("Shared desk");
  const url = page.url();
  expect(url).toContain("#");
  await page.goto("about:blank");
  await page.goto(url);
  await expect(page.getByLabel("Forecast name")).toHaveValue("Shared desk");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("scenarios, actuals, method, and csv export", async ({ page }) => {
  await startFromTemplate(page);
  await page.getByRole("tab", { name: "Scenarios" }).click();
  await page.getByRole("button", { name: /Photon on, assume 2× faster/ }).click();
  await expect(page.getByRole("cell", { name: "Photon on, assume 2× faster" })).toBeVisible();

  await page.getByRole("tab", { name: "Actuals" }).click();
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.getByRole("button", { name: /Scale forecast/ })).toBeVisible();
  await page.getByRole("button", { name: /Scale forecast/ }).click();
  await expect(page.getByRole("button", { name: /Clear scale/ })).not.toContainText("1.00×");

  await page.getByRole("tab", { name: "Method" }).click();
  await expect(page.getByText(/Estimates only/i).first()).toBeVisible();

  await page.getByRole("tab", { name: "Desk" }).click();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  expect((await csvPromise).suggestedFilename()).toMatch(/\.csv$/);
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect((await jsonPromise).suggestedFilename()).toMatch(/\.json$/);
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF" }).click();
  expect((await pdfPromise).suggestedFilename()).toMatch(/\.pdf$/);
});

test("changing cloud and region moves the monthly total", async ({ page }) => {
  await startFromTemplate(page);
  const before = await page.getByTestId("monthly-total").innerText();
  const assumptions = page.getByRole("region", { name: "Portfolio assumptions" });
  await assumptions.getByLabel("Cloud").selectOption("azure");
  await assumptions.getByLabel("Region").selectOption({ label: "Switzerland West" });
  await expect(page.getByTestId("monthly-total")).not.toHaveText(before);
  await expect(page.getByText(/Lakehouse Real-Time ratio/)).toBeVisible();
});

test("adds a workload and toggles dark mode", async ({ page }) => {
  await startFromTemplate(page);
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: /Serverless jobs/ }).click();
  await expect(page.getByRole("button", { name: /Serverless jobs/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "light");
});

test("has no serious accessibility violations on the desk", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "axe runs once");
  await startFromTemplate(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("mobile layout does not overflow the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile project only");
  await startFromTemplate(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("monthly-total")).toBeVisible();
});
