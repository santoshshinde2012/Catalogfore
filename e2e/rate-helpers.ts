import { type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

export type RateTab = "Rates & calculator" | "Compare regions" | "Evidence" | "Downloads";
export async function openRateTab(page: Page, name: RateTab) {
  await page
    .getByRole("tablist", { name: "Unit cost workspace", exact: true })
    .getByRole("tab", { name, exact: true })
    .click();
}

export async function showRateRefinements(page: Page) {
  const refinements = page.getByTestId("rate-refinements");
  if (!(await refinements.evaluate((element) => (element as HTMLDetailsElement).open)))
    await refinements.locator("summary").click();
}

/** Follow the visible export workflow, then return to the user's working panel. */
export async function downloadRates(page: Page, format: "CSV" | "JSON") {
  const tabs = page.getByRole("tablist", { name: "Unit cost workspace", exact: true });
  const previous = (await tabs.getByRole("tab", { selected: true }).innerText()).trim() as RateTab;
  await openRateTab(page, "Downloads");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("region", { name: "Download unit costs", exact: true })
    .getByRole("button", { name: format, exact: true })
    .click();
  const result = await readFile((await (await pending).path())!, "utf8");
  if (previous !== "Downloads") await openRateTab(page, previous);
  return result;
}
