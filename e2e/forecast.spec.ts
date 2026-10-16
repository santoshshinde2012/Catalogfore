import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function sentence(page: Page) {
  return page.getByTestId("year-sentence").innerText();
}

test("four inputs move the year", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What does the next year cost?");
  await expect(page.getByTestId("year-sentence")).toContainText(/About \$[\d,]+ per year, ±\d+%/);
  await expect(page.getByTestId("bill-split")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(13);

  const initial = await sentence(page);
  await page.getByRole("button", { name: /^Small/ }).click();
  await expect(page.getByTestId("year-sentence")).not.toHaveText(initial);
  await expect(page.getByTestId("mix-assumption")).toContainText(/pipelines/);

  const afterSmall = await sentence(page);
  await page.getByRole("button", { name: "10%", exact: true }).click();
  await expect(page.getByTestId("year-sentence")).not.toHaveText(afterSmall);

  const split = await page.getByTestId("bill-split").innerText();
  const pipelines = page.getByRole("slider", { name: /Pipelines/ });
  await pipelines.focus();
  await page.keyboard.press("Home");
  await expect(page.getByTestId("bill-split")).not.toHaveText(split);
});

test("share link restores growth", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "10%", exact: true }).click();
  await expect(page.getByRole("button", { name: "10%", exact: true })).toHaveAttribute("aria-pressed", "true");
  const url = page.url();
  expect(url).toContain("#");
  await page.goto("about:blank");
  await page.goto(url);
  await expect(page.getByRole("button", { name: "10%", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What does the next year cost?");
});

test("cloud, commitment, exports, and a usage file", async ({ page }) => {
  await page.goto("./");
  const before = await sentence(page);
  await page.getByRole("button", { name: "Azure", exact: true }).click();
  await expect(page.getByTestId("year-sentence")).not.toHaveText(before);

  const onAzure = await sentence(page);
  const commit = page.getByRole("slider", { name: /Commitment discount/ });
  await commit.focus();
  await page.keyboard.press("End");
  await expect(page.getByTestId("year-sentence")).not.toHaveText(onAzure);

  await page.getByText("Use my real usage").click();
  await page.getByLabel("Usage CSV").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("not,a,usage,file"),
  });
  await expect(page.getByText("That file did not contain usage rows.")).toBeVisible();

  await page.getByRole("button", { name: "Load a sample" }).click();
  await expect(page.getByTestId("usage-summary")).toContainText("From your usage file");

  await expect(page.getByText("Estimates only").first()).toBeVisible();
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

test("advanced builder, how we got this, and theme", async ({ page }) => {
  await page.goto("./");
  await page.getByText("How we got this").click();
  await expect(page.getByText(/You enter dollars/)).toBeVisible();
  await page.getByText("Advanced", { exact: true }).click();
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: /Serverless jobs/ }).click();
  await expect(page.getByRole("button", { name: /Serverless jobs/ }).first()).toBeVisible();
  await expect(page.getByText(/detailed workloads are driving/)).toBeVisible();
  await expect(page.locator(".site-foot")).toContainText("not affiliated with Databricks");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("customer note links to the account tools", async ({ page }) => {
  await page.goto("./");
  const note = page.getByRole("complementary", { name: "Already a Databricks customer?" });
  await expect(note.getByRole("link", { name: "Usage dashboards" })).toHaveAttribute("href", /account-settings\/usage/);
  await expect(note.getByRole("link", { name: "Budgets" })).toHaveAttribute("href", /budgets/);
  await expect(note.getByRole("link", { name: "ai_forecast" })).toHaveAttribute("href", /ai_forecast/);
});

test("has no serious accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "axe runs once");
  await page.goto("./");
  const home = await new AxeBuilder({ page }).analyze();
  expect(home.violations).toEqual([]);
  await page.getByText("How we got this").click();
  await page.getByText("Ways to pay less").click();
  await page.getByText("Advanced", { exact: true }).click();
  const open = await new AxeBuilder({ page }).analyze();
  expect(open.violations).toEqual([]);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);
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
  await page.getByText("Advanced", { exact: true }).click();
  const opened = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(opened).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("year-total")).toBeVisible();
});
