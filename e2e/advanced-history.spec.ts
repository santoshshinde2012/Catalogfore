import { expect, test } from "@playwright/test";
import { navigateWorkspace } from "./header-helpers";
import { savedDownload } from "./forecast-helpers";

for (const field of [
  { label: "Name", role: "textbox" as const, value: "Production batch renamed" },
  { label: "Hours / day", role: "spinbutton" as const, value: "6.5" },
]) {
  test(`browser Back commits a valid Advanced ${field.label} draft before leaving the plan`, async ({ page }) => {
    await page.goto("./?view=products");
    await page.getByLabel("Search Databricks products", { exact: true }).fill("Jobs cluster");
    await page
      .getByRole("region", { name: "Product directory", exact: true })
      .getByRole("button", { name: /^Jobs cluster\b/ })
      .click();
    await page
      .getByRole("region", { name: "Product details", exact: true })
      .getByRole("button", { name: "Add to forecast", exact: true })
      .click();
    const input = page.getByRole(field.role, { name: field.label, exact: true });
    await input.fill(field.value);
    await page.goBack();
    await expect(page.locator("#product-map")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await navigateWorkspace(page, "Plan");
    await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
    await expect(input).toHaveValue(field.value);
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const workload = (await savedDownload(page)).portfolio.workloads.at(-1)!;
    if (field.label === "Name") expect(workload.name).toBe(field.value);
    else expect(workload.kind === "cluster" && workload.schedule.hoursPerDay).toBe(Number(field.value));
  });
}
