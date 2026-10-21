import { expect, test } from "@playwright/test";
import { selectWorkspaceAction } from "./header-helpers";

test("opening saved scenarios clears invalid budget and discount drafts even when values match", async ({ page }) => {
  await page.goto("./");
  const budget = page.getByRole("spinbutton", { name: "Annual budget", exact: true });
  const discount = page.getByRole("spinbutton", { name: "Cloud machine discount", exact: true });
  await budget.fill("250000");
  await budget.press("Enter");
  await discount.fill("12.5");
  await discount.press("Enter");
  await page.getByRole("textbox", { name: "Scenario name", exact: true }).fill("Saved baseline");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();

  for (const [currentBudget, currentDiscount] of [
    ["250000", "12.5"],
    ["300000", "20"],
  ]) {
    await budget.fill(currentBudget);
    await budget.press("Enter");
    await discount.fill(currentDiscount);
    await discount.press("Enter");
    await budget.fill("-1");
    await budget.press("Enter");
    await discount.fill("96");
    await discount.press("Enter");
    await expect(budget).toHaveAttribute("aria-invalid", "true");
    await expect(discount).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Open Saved baseline", exact: true }).click();
    await expect(budget).toHaveValue("250000");
    await expect(discount).toHaveValue("12.5");
    await expect(budget).toHaveAttribute("aria-invalid", "false");
    await expect(discount).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("new forecast clears invalid planning drafts for changed and unchanged default plans", async ({ page }) => {
  await page.goto("./");
  const budget = page.getByRole("spinbutton", { name: "Annual budget", exact: true });
  const discount = page.getByRole("spinbutton", { name: "Cloud machine discount", exact: true });
  for (const amount of ["", "250000"]) {
    await budget.fill(amount);
    await budget.press("Enter");
    await budget.fill("-1");
    await budget.press("Enter");
    await discount.fill("96");
    await discount.press("Enter");
    await selectWorkspaceAction(page, "New forecast");
    await expect(budget).toHaveValue("");
    await expect(discount).toHaveValue("0");
    await expect(budget).toHaveAttribute("aria-invalid", "false");
    await expect(discount).toHaveAttribute("aria-invalid", "false");
  }
});

test("quick spend and growth drafts follow scenario loads, Undo, and new forecasts", async ({ page }) => {
  await page.goto("./");
  const spend = page.getByRole("textbox", { name: "Starting monthly spend" });
  const growth = page.getByRole("textbox", { name: "Custom monthly growth" });
  await page.getByRole("textbox", { name: "Scenario name", exact: true }).fill("Quick baseline");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();

  async function invalidateDrafts() {
    await spend.fill("-1");
    await spend.press("Enter");
    await growth.fill("21");
    await growth.press("Enter");
    await expect(spend).toHaveAttribute("aria-invalid", "true");
    await expect(growth).toHaveAttribute("aria-invalid", "true");
  }
  async function expectDefaults() {
    await expect(spend).toHaveValue("12000");
    await expect(growth).toHaveValue("3");
    await expect(spend).toHaveAttribute("aria-invalid", "false");
    await expect(growth).toHaveAttribute("aria-invalid", "false");
  }

  for (const value of ["12000", "6000"]) {
    await spend.fill(value);
    await spend.press("Enter");
    await invalidateDrafts();
    await page.getByRole("button", { name: "Open Quick baseline", exact: true }).click();
    await expectDefaults();
  }
  await spend.fill("6000");
  await spend.press("Enter");
  await invalidateDrafts();
  await page.getByRole("button", { name: "Undo last change", exact: true }).click();
  await expectDefaults();

  for (const value of ["12000", "6000"]) {
    await spend.fill(value);
    await spend.press("Enter");
    await invalidateDrafts();
    await selectWorkspaceAction(page, "New forecast");
    await expectDefaults();
  }
});
