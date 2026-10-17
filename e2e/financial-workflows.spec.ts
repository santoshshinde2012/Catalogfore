import { expect, test } from "@playwright/test";
import { exportText, readTable, savedDownload, uploadUsage } from "./forecast-helpers";

test("footer anchors and skip link preserve the forecast through reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const before = await savedDownload(page);
  const url = page.url();
  await page.locator("footer").getByRole("link", { name: "Forecast", exact: true }).click();
  expect(page.url()).toBe(url);
  await page.locator("footer").getByRole("link", { name: "How it works", exact: true }).click();
  expect(page.url()).toBe(url);
  await page.keyboard.press("Control+Home");
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  expect(page.url()).toBe(url);
  await page.reload();
  expect((await savedDownload(page)).annual).toBe(before.annual);
});

test("combined commitment recommendation applies the displayed saving", async ({ page }) => {
  await page.goto("./");
  const before = await savedDownload(page);
  const card = page.locator("li").filter({ hasText: "Commitment discount, plus 30% off machines" });
  const apply = card.getByRole("button", { name: /Apply, save/ });
  const quote = Number((await apply.innerText()).match(/\$([\d,]+)/)?.[1].replaceAll(",", ""));
  await apply.click();
  const after = await savedDownload(page);
  expect(Math.round(before.annual - after.annual)).toBe(quote);
  expect(after.portfolio.commitment).toEqual({ dbuDiscount: 0.37, cloudDiscount: 0.3 });
});

test("priced imported history, chart, monthly table, and exported files reconcile to cents", async ({ page }) => {
  await page.goto("./");
  const csv = [
    "usage_date,sku_name,usage_quantity,usage_unit,list_price,cloud",
    ...Array.from(
      { length: 12 },
      (_, index) => `2025-${String(index + 1).padStart(2, "0")}-15,JOBS_COMPUTE,${1000 + index * 100},DBU,0.1,AZURE`,
    ),
  ].join("\n");
  await uploadUsage(page, csv);
  await expect(page.getByText("$210.00", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Use this baseline" }).click();
  const result = await savedDownload(page);
  expect(result.portfolio.cloud).toBe("azure");
  expect(result.portfolio.usage?.observedMonths).toHaveLength(12);
  expect(result.forecast.map((point) => point.cloudCost)).toEqual(Array(12).fill(0));
  await expect(page.getByTestId("forecast-chart").locator("svg.recharts-surface")).toBeVisible();
  await expect(page.getByTestId("forecast-chart").locator("path.recharts-line-curve[d]")).toHaveCount(2);
  expect(await readTable(page)).toEqual(result.months.map(({ low, expected, high }) => ({ low, expected, high })));
  const exportedRows = (await exportText(page, "CSV")).split("\n").filter((row) => row.startsWith("forecast,"));
  expect(exportedRows.map((row) => Number(row.split(",")[7]))).toEqual(result.months.map((month) => month.expected));
  expect(result.forecast.reduce((sum, point) => sum + point.total, 0)).toBeCloseTo(result.annual, 2);
  await expect(page.getByTestId("year-sentence")).toContainText(
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      result.annual,
    ),
  );
  await page.reload();
  expect((await savedDownload(page)).annual).toBe(result.annual);
});

test("invalid saved JSON leaves the active forecast intact", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const before = await savedDownload(page);
  await page
    .getByLabel("Open a saved forecast")
    .setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /forecast|portfolio/i })
      .first(),
  ).toBeVisible();
  expect((await savedDownload(page)).annual).toBe(before.annual);
});

test("detailed workload survives global growth and budget edits", async ({ page }) => {
  await page.goto("./");
  const before = await savedDownload(page);
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByRole("button", { name: /Serverless jobs/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Annual budget", exact: true }).fill("250000");
  const after = await savedDownload(page);
  expect(after.portfolio.workloads).toHaveLength(before.portfolio.workloads.length + 1);
  expect(after.portfolio.workloads.some((workload) => workload.productId === "jobs_serverless")).toBe(true);
  expect(after.portfolio.budgetAnnual).toBe(250000);
});
