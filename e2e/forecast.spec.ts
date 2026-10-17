import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { selectTheme } from "./header-helpers";

async function sentence(page: Page) {
  return page.getByTestId("year-sentence").innerText();
}

test("four inputs move the year", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What does the next year cost?");
  await expect(page.getByTestId("year-sentence")).toContainText(/About \$170,258 per year, ±20%/);
  await expect(page.getByText(/Price book dated \d{4}-\d{2}-\d{2}, catalog v\d{4}-\d{2}-\d{2}\.\d+/)).toBeVisible();
  await expect(page.getByTestId("bill-split")).toBeVisible();
  await page.getByRole("tab", { name: "Months" }).click();
  await expect(page.getByRole("row")).toHaveCount(13);

  const initial = await sentence(page);
  await page.getByRole("radio", { name: /^Small/ }).click();
  await expect(page.getByTestId("year-sentence")).not.toHaveText(initial);
  await expect(page.getByTestId("mix-assumption")).toContainText(/pipelines/);

  const afterSmall = await sentence(page);
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await expect(page.getByTestId("year-sentence")).not.toHaveText(afterSmall);

  const split = await page.getByTestId("bill-split").innerText();
  const pipelines = page.getByRole("slider", { name: /Pipelines/ });
  await pipelines.focus();
  await page.keyboard.press("Home");
  await expect(page.getByTestId("bill-split")).not.toHaveText(split);
});

test("share link restores growth", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
  const url = page.url();
  expect(url).toContain("#");
  await page.goto("about:blank");
  await page.goto(url);
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What does the next year cost?");
});

test("cloud, commitment, exports, and a usage file", async ({ page }) => {
  await page.goto("./");
  const before = await sentence(page);
  await page.getByRole("radio", { name: "Azure", exact: true }).click();
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
  await expect(
    page.getByRole("alert").filter({ hasText: /No data rows found|did not contain usage rows/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Load a sample" }).click();
  await expect(page.getByRole("heading", { name: "Review usage import" })).toBeVisible();
  await page.getByRole("button", { name: "Use this baseline" }).click();
  await expect(page.getByText(/Based on .* imported/)).toBeVisible();

  await expect(page.getByText("Estimates only").first()).toBeVisible();
  await expect(page.getByText(/The calculation stays in this browser/)).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  const xlsxPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^XLSX\b/ }).click();
  expect((await xlsxPromise).suggestedFilename()).toMatch(/^cayfore-forecast-[a-z]+-\d{4}-\d{2}-\d{2}\.xlsx$/);
  await page.getByRole("button", { name: "Export" }).click();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^CSV\b/ }).click();
  expect((await csvPromise).suggestedFilename()).toMatch(/\.csv$/);
  await page.getByRole("button", { name: "Export" }).click();
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^JSON\b/ }).click();
  expect((await jsonPromise).suggestedFilename()).toMatch(/\.json$/);
  await page.getByRole("button", { name: "Export" }).click();
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^PDF\b/ }).click();
  expect((await pdfPromise).suggestedFilename()).toMatch(/\.pdf$/);
});

test("advanced builder, how we got this, and theme", async ({ page }) => {
  await page.goto("./");
  await page.getByText("How we got this").click();
  await expect(page.getByText(/Growth is .*per year with flat seasonality/).first()).toBeVisible();
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "By product" })).toBeVisible();
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText("Data Engineering").first()).toBeVisible();
  await expect(page.getByText("Warehousing & BI").first()).toBeVisible();
  await expect(page.getByText("AI/ML").first()).toBeVisible();
  await expect(page.getByText("Apps & OLTP").first()).toBeVisible();
  await expect(page.getByText("Governance & Sharing").first()).toBeVisible();
  await page.getByRole("button", { name: /Serverless jobs/ }).click();
  await expect(page.getByRole("button", { name: /Serverless jobs/ }).first()).toBeVisible();
  await expect(page.getByText(/detailed workloads are driving/)).toBeVisible();
  const footer = page.locator("footer");
  await expect(footer).toContainText("not affiliated with Databricks");
  await page.keyboard.press("Escape");
  await expect(footer.getByRole("link", { name: "Source" })).toHaveAttribute(
    "href",
    "https://github.com/santoshshinde2012/cayfore",
  );
  await expect(footer.getByRole("link", { name: "License" })).toHaveAttribute("href", /LICENSE/);
  await expect(footer.getByRole("link", { name: "Research", exact: true })).toHaveAttribute("href", /RESEARCH\.md/);
  await expect(footer.getByRole("link", { name: "Unit costs", exact: true })).toHaveAttribute("href", "?view=rates");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await selectTheme(page, "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await selectTheme(page, "light");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("customer note links to the account tools", async ({ page }) => {
  await page.goto("./");
  const note = page.getByRole("complementary", { name: "Already a Databricks customer?" });
  await expect(note.getByRole("link", { name: "Usage dashboards" })).toHaveAttribute("href", /account-settings\/usage/);
  await expect(note.getByRole("link", { name: "Budgets" })).toHaveAttribute("href", /budgets/);
  await expect(note.getByRole("link", { name: "ai_forecast" })).toHaveAttribute("href", /ai_forecast/);
});

test("has no serious accessibility violations", async ({ page }) => {
  await page.goto("./");
  const home = await new AxeBuilder({ page }).analyze();
  expect(home.violations).toEqual([]);
  await page.getByText("How we got this").click();
  await page.getByText("Ways to pay less").click();
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.keyboard.press("Escape");
  const open = await new AxeBuilder({ page }).analyze();
  expect(open.violations).toEqual([]);
  await selectTheme(page, "dark");
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);
  await selectTheme(page, "light");
  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);
});

test("unknown address explains that the page is not part of the forecast", async ({ page }) => {
  await page.goto("./404.html");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "Back to the forecast" })).toHaveAttribute("href", "/cayfore/");
  await expect(page.locator("footer")).toContainText("not affiliated with Databricks");
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});

test("search and share metadata point at the Cayfore pages address", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Cayfore — Databricks cost calculator and DBU forecast");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://santoshshinde2012.github.io/cayfore/",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Databricks pricing estimator/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/cayfore\/og\.png$/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest$/);
  await expect(page.locator("#crawl-content")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("an existing theme choice survives the key change", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("dcf-theme", "dark");
    localStorage.removeItem("cayfore-theme");
  });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("cayfore-theme"))).toBe("dark");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("dcf-theme"))).toBeNull();
  await selectTheme(page, "light");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("mobile layout does not overflow the viewport", { tag: "@mobile" }, async ({ page }) => {
  await page.goto("./");
  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(homeOverflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("year-total")).toBeVisible();
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  const opened = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(opened).toBeLessThanOrEqual(1);
});
