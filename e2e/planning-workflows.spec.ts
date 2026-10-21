import { expect, test } from "@playwright/test";
import { chooseOption, chooseOptionByName } from "./combobox";
import { savedDownload, uploadUsage } from "./forecast-helpers";

test("named budget scenarios save, compare, duplicate, and reopen after reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("spinbutton", { name: "Annual budget", exact: true }).fill("200000");
  const baseline = await savedDownload(page);
  await page.getByRole("textbox", { name: "Scenario name" }).fill("Budget baseline");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await chooseOptionByName(page, "Compare scenario", "Budget baseline", false);
  await expect(page.getByTestId("scenario-delta")).toContainText("more than Budget baseline");
  await expect(page.getByTestId("budget-variance")).toContainText("annual budget");
  await expect(page.getByTestId("forecast-chart").locator("path.recharts-line-curve[d]")).toHaveCount(3);
  await page.getByRole("button", { name: "Duplicate Budget baseline", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Budget baseline copy", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Annual budget", exact: true })).toHaveValue("200000");
  await page.getByRole("button", { name: "Open Budget baseline", exact: true }).click();
  expect((await savedDownload(page)).annual).toBe(baseline.annual);
  await page.getByRole("button", { name: "Delete Budget baseline copy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Budget baseline copy", exact: true })).toHaveCount(0);
});

test("dated changes begin in the selected month and survive saved-plan reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "0%", exact: true }).click();
  await page.getByLabel("Forecast start month", { exact: true }).fill("2026-11");
  const before = await savedDownload(page);
  await page.getByText("Plan launches and usage changes", { exact: true }).click();
  await page.getByRole("textbox", { name: "Change name" }).fill("Launch in January");
  await page.getByLabel("Effective month", { exact: true }).fill("2027-01");
  await page.getByRole("spinbutton", { name: "Usage change (%)", exact: true }).fill("50");
  await page.getByRole("button", { name: "Add planned change", exact: true }).click();
  const after = await savedDownload(page);
  expect(after.portfolio.events).toHaveLength(1);
  expect(after.forecast[0].total).toBe(before.forecast[0].total);
  expect(after.forecast[1].total).toBe(before.forecast[1].total);
  expect(after.forecast[2].total).toBeCloseTo(before.forecast[2].total * 1.5, 1);
  expect(after.forecast[11].total).toBeCloseTo(before.forecast[11].total * 1.5, 1);
  await page.reload();
  expect((await savedDownload(page)).forecast).toEqual(after.forecast);
});

test("a partial-only usage file stays reviewable until its month is explicitly chosen", async ({ page }) => {
  await page.goto("./");
  await page.getByText("Use my real usage", { exact: true }).click();
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  await page.getByLabel("Usage CSV", { exact: true }).setInputFiles({
    name: "partial.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `usage_date,sku_name,usage_quantity,usage_unit,list_price\n${month}-01,JOBS_COMPUTE,100,DBU,0.1`,
    ),
  });
  await expect(page.getByRole("heading", { name: "Review usage import" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use this baseline" })).toBeDisabled();
  await chooseOption(page, "Import baseline month", month, false);
  await expect(page.getByRole("button", { name: "Use this baseline" })).toBeEnabled();
  await page.getByRole("button", { name: "Use this baseline" }).click();
  expect((await savedDownload(page)).portfolio.usage?.selectedMonth).toBe(month);
});

test("calendar and dated changes preserve quick inputs and undo only the last change", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("Forecast start month", { exact: true }).fill("2027-01");
  const spend = page.getByRole("textbox", { name: "Starting monthly spend" });
  await expect(spend).toBeVisible();
  await page.getByText("Plan launches and usage changes", { exact: true }).click();
  await page.getByRole("textbox", { name: "Change name" }).fill("Quarterly expansion");
  await page.getByLabel("Effective month", { exact: true }).fill("2027-03");
  await page.getByRole("button", { name: "Add planned change", exact: true }).click();
  await expect(spend).toBeVisible();
  await spend.fill("6000");
  await spend.press("Enter");
  const changed = await savedDownload(page);
  expect(changed.portfolio.events).toHaveLength(1);
  expect(changed.portfolio.forecast.startMonth).toBe("2027-01");
  await page.getByRole("button", { name: "Undo last change", exact: true }).click();
  await expect(spend).toHaveValue("12000");
  const undone = await savedDownload(page);
  expect(undone.portfolio.events).toEqual(changed.portfolio.events);
  expect(undone.portfolio.forecast.startMonth).toBe("2027-01");
});

test("budget and cloud discount drafts validate before changing the forecast", async ({ page }) => {
  await page.goto("./");
  const budget = page.getByRole("spinbutton", { name: "Annual budget", exact: true });
  await budget.fill("200000");
  await budget.press("Enter");
  const before = await savedDownload(page);
  await budget.fill("-1");
  await budget.press("Enter");
  await expect(budget).toHaveValue("-1");
  await expect(budget).toHaveAttribute("aria-invalid", "true");
  expect((await savedDownload(page)).portfolio.budgetAnnual).toBe(200000);

  await budget.fill("");
  await budget.pressSequentially("1e");
  await budget.press("Enter");
  await expect(budget).toHaveAttribute("aria-invalid", "true");
  expect((await savedDownload(page)).portfolio.budgetAnnual).toBe(200000);

  await budget.fill("");
  await budget.press("Enter");
  expect((await savedDownload(page)).portfolio.budgetAnnual).toBeUndefined();

  const discount = page.getByRole("spinbutton", { name: "Cloud machine discount", exact: true });
  await discount.fill("12.5");
  await discount.press("Enter");
  await expect(discount).toHaveValue("12.5");
  const discounted = await savedDownload(page);
  expect(discounted.portfolio.commitment.cloudDiscount).toBe(0.125);
  expect(discounted.annual).toBeLessThan(before.annual);
  await discount.fill("");
  await discount.press("Enter");
  await expect(discount).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toContainText("Enter a cloud machine discount from 0% to 95%.");
  expect((await savedDownload(page)).annual).toBe(discounted.annual);
  await discount.fill("96");
  await discount.press("Enter");
  await expect(discount).toHaveValue("96");
  expect((await savedDownload(page)).portfolio.commitment.cloudDiscount).toBe(0.125);
});

test("unpriced usage does not claim confirmed budget headroom", async ({ page }) => {
  await page.goto("./");
  await uploadUsage(
    page,
    "usage_date,sku_name,usage_quantity,usage_unit,cloud\n2026-09-01,UNPUBLISHED_SERVICE,100,DBU,AWS",
  );
  await page.getByRole("button", { name: "Use this baseline" }).click();
  const budget = page.getByRole("spinbutton", { name: "Annual budget", exact: true });
  await budget.fill("200000");
  await budget.press("Enter");
  await expect(page.getByTestId("budget-variance")).toContainText("Budget headroom is not yet confirmed");
  await expect(page.getByTestId("budget-variance")).toContainText("Unresolved prices are excluded");
  await expect(page.getByTestId("budget-variance")).not.toContainText("under the annual budget");
});
