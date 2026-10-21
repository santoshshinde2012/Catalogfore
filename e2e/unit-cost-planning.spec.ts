import { expect, test, type Page } from "@playwright/test";
import { chooseOption } from "./combobox";
import { savedDownload } from "./forecast-helpers";
import { navigateWorkspace } from "./header-helpers";

function calculator(page: Page) {
  return page.getByRole("region", { name: "Unit cost calculator", exact: true });
}

function feedback(page: Page) {
  return page.getByRole("region", { name: "Forecast change", exact: true });
}

async function openJobsRate(page: Page) {
  await navigateWorkspace(page, "Unit costs");
  await chooseOption(page, "Product or service", "jobs_serverless");
  await expect(calculator(page)).toBeVisible();
}

async function proposedTotals(page: Page) {
  await expect(page.getByRole("region", { name: "Forecast impact", exact: true })).toBeVisible();
  const annual = Number(await page.getByTestId("rate-proposed-annual").getAttribute("data-value"));
  const monthly = Number(await page.getByTestId("rate-proposed-monthly").getAttribute("data-value"));
  expect(annual).toBeGreaterThan(0);
  expect(monthly).toBeGreaterThan(0);
  return { annual, monthly };
}

test("calculator add and update preserve the plan and reconcile preview, export, and reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Annual budget", exact: true }).fill("250000");
  await page.getByRole("spinbutton", { name: "Cloud machine discount", exact: true }).fill("15");
  await page.getByRole("slider", { name: "Commitment discount", exact: true }).focus();
  await page.keyboard.press("End");
  const baseline = await savedDownload(page);
  await openJobsRate(page);
  const quantity = calculator(page).getByRole("spinbutton", { name: "Billable quantity (DBU)", exact: true });
  await expect(quantity).toHaveAccessibleDescription(/month/i);
  const unchangedHash = new URL(page.url()).hash;
  await quantity.fill("240");
  const addedPreview = await proposedTotals(page);
  expect(new URL(page.url()).hash).toBe(unchangedHash);
  await calculator(page).getByRole("button", { name: "Add to forecast", exact: true }).click();
  await expect(feedback(page)).toBeVisible();
  await expect(calculator(page).getByRole("button", { name: "Update forecast", exact: true })).toBeVisible();
  await feedback(page).getByRole("button", { name: "View forecast", exact: true }).click();
  const added = await savedDownload(page);
  expect(added.annual).toBe(addedPreview.annual);
  expect(added.forecast[0].total).toBe(addedPreview.monthly);
  expect(added.portfolio.workloads.slice(0, baseline.portfolio.workloads.length)).toEqual(baseline.portfolio.workloads);
  expect(added.portfolio.workloads).toHaveLength(baseline.portfolio.workloads.length + 1);
  const addedWorkload = added.portfolio.workloads.at(-1)!;
  expect(addedWorkload).toMatchObject({ productId: "jobs_serverless", kind: "metered", dbuPerMonth: 240 });
  expect(added.portfolio.forecast).toEqual(baseline.portfolio.forecast);
  expect(added.portfolio.commitment).toEqual(baseline.portfolio.commitment);
  expect(added.portfolio.budgetAnnual).toBe(baseline.portfolio.budgetAnnual);

  await openJobsRate(page);
  await expect(quantity).toHaveValue("240");
  await quantity.fill("480");
  const updatedPreview = await proposedTotals(page);
  await calculator(page).getByRole("button", { name: "Update forecast", exact: true }).click();
  await feedback(page).getByRole("button", { name: "View forecast", exact: true }).click();
  const updated = await savedDownload(page);
  expect(updated.annual).toBe(updatedPreview.annual);
  expect(updated.forecast[0].total).toBe(updatedPreview.monthly);
  expect(updated.portfolio.workloads.map((workload) => workload.id)).toEqual(
    added.portfolio.workloads.map((workload) => workload.id),
  );
  expect(updated.portfolio.workloads.at(-1)).toMatchObject({ id: addedWorkload.id, dbuPerMonth: 480 });
  expect(updated.portfolio.workloads.slice(0, -1)).toEqual(baseline.portfolio.workloads);
  expect(updated.portfolio.forecast).toEqual(baseline.portfolio.forecast);
  expect(updated.portfolio.commitment).toEqual(baseline.portfolio.commitment);
  expect(updated.portfolio.budgetAnnual).toBe(baseline.portfolio.budgetAnnual);
  expect(updated.forecast.reduce((sum, month) => sum + month.total, 0)).toBeCloseTo(updated.annual, 2);
  await page.reload();
  const restored = await savedDownload(page);
  expect(restored.portfolio).toEqual(updated.portfolio);
  expect(restored.forecast).toEqual(updated.forecast);
  expect(restored.annual).toBe(updatedPreview.annual);
});

test("calculator change can be undone from persistent feedback without leaving unit costs", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("spinbutton", { name: "Annual budget", exact: true }).fill("200000");
  const baseline = await savedDownload(page);
  await openJobsRate(page);
  const before = new URL(page.url()).hash;
  await calculator(page).getByRole("spinbutton", { name: "Billable quantity (DBU)", exact: true }).fill("240");
  await calculator(page).getByRole("button", { name: "Add to forecast", exact: true }).click();
  await expect(feedback(page)).toBeVisible();
  await expect(calculator(page).getByRole("button", { name: "Update forecast", exact: true })).toBeDisabled();
  expect(new URL(page.url()).hash).not.toBe(before);
  await feedback(page).getByRole("button", { name: "Undo change", exact: true }).click();
  await expect(calculator(page).getByRole("button", { name: "Add to forecast", exact: true })).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe(before);
  await expect(page.getByRole("heading", { name: "Unit costs", exact: true })).toBeVisible();
  await feedback(page).getByRole("button", { name: "View forecast", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Previous forecast restored." })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /Set .* to 240 DBU per baseline month/ })).toHaveCount(0);
  const restored = await savedDownload(page);
  expect(restored.portfolio).toEqual(baseline.portfolio);
  expect(restored.annual).toBe(baseline.annual);
});

test("invalid and over-limit monthly quantities explain why the forecast cannot be changed", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_serverless");
  const quantity = calculator(page).getByRole("spinbutton", { name: "Billable quantity (DBU)", exact: true });
  const apply = calculator(page).getByRole("button", { name: "Add to forecast", exact: true });
  await expect(apply).toBeEnabled();
  const before = new URL(page.url()).hash;
  await quantity.fill("-1");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await expect(apply).toBeDisabled();
  await expect(calculator(page)).toContainText(/non-negative|at least 0|zero or more|from 0/i);
  await quantity.fill("1000000000001");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await expect(apply).toBeDisabled();
  await expect(calculator(page)).toContainText(/1,000,000,000,000|1e12|trillion/i);
  await quantity.fill("");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await expect(apply).toBeDisabled();
  expect(new URL(page.url()).hash).toBe(before);
  await quantity.fill("0");
  await expect(quantity).toHaveAttribute("aria-invalid", "false");
  await expect(apply).toBeEnabled();
});

test("usage calibration limits explain a valid calculator quantity that cannot be saved", async ({ page }) => {
  await page.goto("./");
  const { portfolio } = await savedDownload(page);
  portfolio.name = "Calibrated quantity boundary";
  portfolio.workloads = [];
  portfolio.usageScale = 0.0001;
  delete portfolio.simple;
  await page.getByLabel("Open a saved forecast", { exact: true }).setInputFiles({
    name: "calibrated-forecast.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(portfolio)),
  });
  await expect(page.getByText("The detailed workloads are driving this forecast.", { exact: false })).toBeVisible();
  expect((await savedDownload(page)).portfolio.usageScale).toBe(0.0001);
  await openJobsRate(page);
  const quantity = calculator(page).getByRole("spinbutton", { name: "Billable quantity (DBU)", exact: true });
  const apply = calculator(page).getByRole("button", { name: "Add to forecast", exact: true });
  const before = new URL(page.url()).hash;
  await quantity.fill("1000000000000");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await expect(apply).toBeDisabled();
  await expect(quantity).toHaveAccessibleDescription(/cannot be stored with this plan.s usage calibration/i);
  await expect(page.getByRole("region", { name: "Forecast impact", exact: true })).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe(before);
  await quantity.fill("240");
  await expect(quantity).toHaveAttribute("aria-invalid", "false");
  await expect(apply).toBeEnabled();
  await expect(page.getByRole("region", { name: "Forecast impact", exact: true })).toBeVisible();
});
