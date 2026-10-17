import type { Portfolio } from "@cayfore/engine";
import { expect, test } from "@playwright/test";
import { savedDownload } from "./forecast-helpers";

test("forecast references keep a workload's cloud, region and edition through reload and browser Back", async ({
  page,
}) => {
  const portfolio: Portfolio = {
    version: 1,
    name: "Cross-cloud reference",
    cloud: "aws",
    region: "us-east-1",
    tier: "premium",
    workloads: [],
    commitment: { dbuDiscount: 0, cloudDiscount: 0 },
    addon: "none",
    usageScale: 1,
    forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
  };
  portfolio.workloads = [
    {
      id: "azure-job",
      name: "Azure reference job",
      productId: "jobs_serverless",
      kind: "serverless_compute",
      sku: "jobs_serverless",
      dbuPerHour: 10,
      schedule: { hoursPerDay: 8, daysPerWeek: 5 },
      cloud: "azure",
      region: "eastus",
      tier: "enterprise",
    },
  ];
  await page.goto("./");
  await page.getByLabel("Open a saved forecast", { exact: true }).setInputFiles({
    name: "forecast.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(portfolio)),
  });
  await expect(page.getByText("The detailed workloads are driving this forecast.", { exact: false })).toBeVisible();
  const before = await savedDownload(page);
  const hash = new URL(page.url()).hash;
  await page.getByText("Inspect rates and assumptions", { exact: true }).click();
  await page.getByRole("button", { name: "View reference unit costs", exact: true }).click();
  await expect(page.locator("#unit-costs")).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Product or service", exact: true })).toHaveValue("jobs_serverless");
  await expect(page.getByRole("combobox", { name: "Cloud", exact: true })).toHaveValue("azure");
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toHaveValue("eastus");
  await expect(page.getByRole("combobox", { name: "Edition", exact: true })).toHaveValue("enterprise");
  expect(new URL(page.url()).hash).toBe(hash);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Cloud", exact: true })).toHaveValue("azure");
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toHaveValue("eastus");
  await page.goBack();
  await expect(page.getByTestId("year-sentence")).toBeVisible();
  expect(new URL(page.url()).hash).toBe(hash);
  const after = await savedDownload(page);
  expect(after.portfolio).toEqual(before.portfolio);
  expect(after.annual).toBe(before.annual);
});
