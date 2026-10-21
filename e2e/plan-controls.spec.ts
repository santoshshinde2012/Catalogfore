import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { uploadUsage } from "./forecast-helpers";

test("cloud, tier, region, spend, and growth each move the year", async ({ page }) => {
  await page.goto("./");
  const sentence = page.getByTestId("year-sentence");
  await expect(sentence).toContainText(/About \$170,258 per year\. Planning range \$144,719 to \$204,309/);
  const initial = await sentence.innerText();

  await page.getByRole("combobox", { name: "Region" }).click();
  await page.getByRole("option", { name: "South America (São Paulo)" }).click();
  await expect(sentence).not.toHaveText(initial);
  const onRegion = await sentence.innerText();

  await page.getByRole("radio", { name: "Enterprise", exact: true }).click();
  await expect(sentence).not.toHaveText(onRegion);
  const onEnterprise = await sentence.innerText();

  await page.getByRole("radio", { name: "Azure", exact: true }).click();
  await expect(sentence).not.toHaveText(onEnterprise);
  const onCloud = await sentence.innerText();

  const spend = page.getByRole("textbox", { name: "Starting monthly spend" });
  await spend.fill("8000");
  await spend.press("Enter");
  await expect(sentence).not.toHaveText(onCloud);
  const onSpend = await sentence.innerText();

  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await expect(sentence).not.toHaveText(onSpend);
});

test("uploading the bundled usage sample replaces the baseline", async ({ page }) => {
  await page.goto("./");
  const sentence = page.getByTestId("year-sentence");
  const before = await sentence.innerText();
  const csv = await readFile(new URL("../apps/web/public/sample-usage.csv", import.meta.url), "utf8");
  await uploadUsage(page, csv);
  await page.getByRole("button", { name: "Use this baseline" }).click();
  await expect(page.getByText(/Based on .* imported/)).toBeVisible();
  await expect(sentence).not.toHaveText(before);
});
