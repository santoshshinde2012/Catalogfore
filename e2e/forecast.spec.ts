import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function startFromQuestion(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: /What will my team cost next year/ }).click();
  await expect(page.getByLabel("Forecast name")).toHaveValue("What will my team cost next year?");
  await expect(page.getByTestId("monthly-total")).not.toHaveText("$0.00");
}

test("question, edit, and live total", async ({ page }) => {
  await startFromQuestion(page);
  const before = await page.getByTestId("monthly-total").innerText();
  await page.getByRole("button", { name: /Nightly transforms/ }).click();
  const hours = page.getByLabel("Hours / day");
  await hours.fill("12");
  await expect(page.getByTestId("monthly-total")).not.toHaveText(before);
});

test("share link restores the forecast name", async ({ page }) => {
  await startFromQuestion(page);
  await page.getByLabel("Forecast name").fill("Shared desk");
  const url = page.url();
  expect(url).toContain("#");
  await page.goto("about:blank");
  await page.goto(url);
  await expect(page.getByLabel("Forecast name")).toHaveValue("Shared desk");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shared desk");
});

test("savings, usage file, and exports", async ({ page }) => {
  await startFromQuestion(page);
  const before = await page.getByTestId("monthly-total").innerText();
  await page.getByRole("button", { name: "Apply Move classic jobs to serverless" }).click();
  await expect(page.getByTestId("monthly-total")).not.toHaveText(before);

  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.getByRole("button", { name: /Scale forecast/ })).toBeVisible();
  await page.getByRole("button", { name: /Scale forecast/ }).click();
  await expect(page.getByRole("button", { name: /Clear scale/ })).not.toContainText("1.00×");

  await expect(page.getByText(/Estimates only/i).first()).toBeVisible();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await csvPromise).suggestedFilename()).toMatch(/\.csv$/);
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect((await jsonPromise).suggestedFilename()).toMatch(/\.json$/);
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF" }).click();
  expect((await pdfPromise).suggestedFilename()).toMatch(/\.pdf$/);
});

test("changing cloud and region moves the monthly total", async ({ page }) => {
  await startFromQuestion(page);
  const before = await page.getByTestId("monthly-total").innerText();
  const assumptions = page.getByRole("region", { name: "Portfolio assumptions" });
  await assumptions.getByLabel("Cloud").selectOption("azure");
  await assumptions.getByLabel("Region").selectOption({ label: "Switzerland West" });
  await expect(page.getByTestId("monthly-total")).not.toHaveText(before);
  await expect(assumptions.getByText(/Lakehouse Real-Time ratio/)).toBeVisible();
});

test("adds a workload, rejects a bad usage file, and toggles theme", async ({ page }) => {
  await startFromQuestion(page);
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: /Serverless jobs/ }).click();
  await expect(page.getByRole("button", { name: /Serverless jobs/ }).first()).toBeVisible();
  await page.getByLabel("Or paste CSV").fill("not,a,usage,file");
  await expect(page.getByText("That file did not contain DBU rows.")).toBeVisible();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "light");
});

test("empty forecast and a long name stay on the page", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start empty" }).click();
  await expect(page.getByText("Nothing is on this forecast yet.")).toBeVisible();
  await expect(page.getByTestId("monthly-total")).toHaveText("$0.00");
  const longName = "Q4 platform budget for the analytics guild and partner sandbox";
  await page.getByLabel("Forecast name").fill(longName);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(longName);
});

test("has no serious accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "axe runs once");
  await page.goto("./");
  const home = await new AxeBuilder({ page }).analyze();
  expect(home.violations).toEqual([]);
  await startFromQuestion(page);
  const answer = await new AxeBuilder({ page }).analyze();
  expect(answer.violations).toEqual([]);
  await page.getByRole("button", { name: /Nightly transforms/ }).click();
  const editor = await new AxeBuilder({ page }).analyze();
  expect(editor.violations).toEqual([]);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);
});

test("mobile layout does not overflow the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile project only");
  await page.goto("./");
  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(homeOverflow).toBeLessThanOrEqual(1);
  await startFromQuestion(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("monthly-total")).toBeVisible();
  await page
    .getByLabel("Forecast name")
    .fill("A very long forecast name that should wrap instead of widening the page");
  const named = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(named).toBeLessThanOrEqual(1);
});
