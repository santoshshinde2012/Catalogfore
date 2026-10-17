import { expect, test } from "@playwright/test";
import { openRateTab, showRateRefinements } from "./rate-helpers";

test("primary workspaces are reachable on a narrow screen without opening the menu", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const before = new URL(page.url()).hash;
  const navigation = page.getByRole("navigation", { name: "Workspace", exact: true });
  for (const name of ["Plan", "Product map", "Unit costs"]) {
    const action = navigation.getByRole("button", { name, exact: true });
    await expect(action).toBeInViewport();
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  for (const [name, id] of [
    ["Unit costs", "unit-costs"],
    ["Product map", "product-map"],
    ["Plan", "plan-inputs"],
  ]) {
    await navigation.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect(navigation.getByRole("button", { name, exact: true })).toHaveAttribute("aria-current", "page");
    expect(new URL(page.url()).hash).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("baseline entry points lead the form and the forecast stays available during edits", async ({
  page,
  isMobile,
}) => {
  await page.goto("./");
  const inputs = page.locator("#plan-inputs");
  const usage = inputs.getByRole("button", { name: "Use my real usage", exact: true });
  const advanced = inputs.getByRole("button", { name: "Advanced", exact: true });
  await expect(usage).toBeInViewport();
  await expect(advanced).toBeInViewport();
  const spend = page.getByRole("textbox", { name: "Starting monthly spend", exact: true });
  expect((await usage.boundingBox())!.y).toBeLessThan((await spend.boundingBox())!.y);
  await usage.click();
  await expect(inputs.getByText("Choose CSV", { exact: true })).toBeVisible();
  await usage.click();
  const previous = await page.getByTestId("year-sentence").innerText();
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await expect(page.getByTestId("year-sentence")).not.toHaveText(previous);
  if (isMobile) {
    const shortcut = page.getByRole("complementary", { name: "Forecast shortcut" });
    await expect(shortcut).toBeInViewport();
    await shortcut.getByRole("button", { name: "View forecast", exact: true }).click();
    await expect(page.locator("#forecast")).toBeFocused();
  } else await expect(page.getByTestId("year-total")).toBeInViewport();
});

test("rates workspace preserves calculation and download choices while switching tasks", async ({ page }) => {
  await page.goto("./?view=rates&product=jobs_serverless&rateCloud=azure&rateRegion=eastus&rateTier=premium");
  const quantity = page.getByRole("spinbutton", { name: "Billable quantity (DBU)", exact: true });
  await quantity.fill("456");
  await showRateRefinements(page);
  await page.getByRole("combobox", { name: "Evidence basis", exact: true }).selectOption("official");
  await openRateTab(page, "Compare regions");
  const compare = page.getByRole("tab", { name: "Compare regions", exact: true });
  await compare.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Evidence", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Evidence coverage", exact: true })).toBeVisible();
  await openRateTab(page, "Downloads");
  await page.getByRole("combobox", { name: "Download scope", exact: true }).selectOption("all");
  await openRateTab(page, "Rates & calculator");
  await expect(quantity).toHaveValue("456");
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toHaveValue("eastus");
  await expect(page.getByRole("combobox", { name: "Evidence basis", exact: true })).toHaveValue("official");
  await openRateTab(page, "Downloads");
  await expect(page.getByRole("combobox", { name: "Download scope", exact: true })).toHaveValue("all");
});
