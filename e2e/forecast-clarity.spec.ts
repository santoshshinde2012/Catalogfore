import { expect, test } from "@playwright/test";
import { chooseOptionByName } from "./combobox";
import { uploadUsage } from "./forecast-helpers";
import { selectWorkspaceAction } from "./header-helpers";

test("comparisons disclose missing prices in a saved baseline even when the current forecast is priced", async ({
  page,
}) => {
  await page.goto("./");
  await uploadUsage(
    page,
    "usage_date,sku_name,usage_quantity,usage_unit,cloud\n2026-09-01,UNPUBLISHED_SERVICE,100,DBU,AWS",
  );
  await page.getByRole("button", { name: "Use this baseline", exact: true }).click();
  await page.getByRole("textbox", { name: "Scenario name", exact: true }).fill("Missing quote");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await selectWorkspaceAction(page, "New forecast");
  await chooseOptionByName(page, "Compare scenario", "Missing quote", false);
  await expect(page.getByTestId("year-sentence")).toContainText("About $170,258 per year.");
  const comparison = page.getByTestId("scenario-delta");
  await expect(comparison).toContainText("in known costs");
  await expect(comparison).toContainText("Unresolved charges are excluded from Missing quote");
  await expect(comparison).toContainText("not a complete cost comparison");
  await expect(page.getByText("Missing quote (known subtotal)", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Cumulative", exact: true }).click();
  await expect(page.getByText("Missing quote (known subtotal)", { exact: true })).toBeVisible();
});

test("commitment what-if rejects out-of-range inputs and recovers without changing or crashing the plan", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const hash = new URL(page.url()).hash;
  await page.getByText("Commitment break-even what-if", { exact: true }).click();
  const allowance = page.getByRole("spinbutton", { name: "12-month list-value allowance (USD)", exact: true });
  const eligible = page.getByRole("spinbutton", { name: "First-month eligible list spend (USD)", exact: true });
  const discount = page.getByRole("spinbutton", { name: "Purchase discount (%)", exact: true });
  await allowance.fill("120000");
  await eligible.fill("1e308");
  await expect(eligible).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#commitment-guidance")).toContainText("$1,000,000,000,000");
  await expect(page.getByTestId("year-total")).toBeVisible();
  await eligible.fill("10000");
  await expect(eligible).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText(/Total eligible cost/)).toBeVisible();
  await discount.fill("100");
  await expect(discount).toHaveAttribute("aria-invalid", "true");
  await discount.fill("25");
  await allowance.fill("1000000000001");
  await expect(allowance).toHaveAttribute("aria-invalid", "true");
  await allowance.fill("0");
  await expect(page.getByText("Same estimated cost as pay as you go", { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(hash);
  expect(errors).toEqual([]);
});
