import { expect, test } from "@playwright/test";
import { savedDownload } from "./forecast-helpers";

test("Advanced preserves product machine defaults and adapts templates to another cloud", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByRole("button", { name: /^Lakeflow pipeline Classic Pro/ }).click();
  await page.keyboard.press("Escape");
  const aws = await savedDownload(page);
  expect(aws.portfolio.workloads.at(-1)).toMatchObject({
    productId: "dlt_pro",
    kind: "cluster",
    instanceId: "i3.xlarge",
  });

  await page.getByRole("radio", { name: "Azure", exact: true }).click();
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByRole("button", { name: /^Lakeflow pipeline Classic Pro/ }).click();
  await page.keyboard.press("Escape");
  const azure = await savedDownload(page);
  expect(azure.portfolio.cloud).toBe("azure");
  expect(azure.portfolio.workloads.at(-1)).toMatchObject({
    productId: "dlt_pro",
    kind: "cluster",
    instanceId: "Standard_DS3_v2",
  });
});
