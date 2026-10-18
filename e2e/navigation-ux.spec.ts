import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openWorkspaceMenu, selectWorkspaceAction, workspaceMenuTrigger } from "./header-helpers";

test("brand navigation preserves the plan and Open works from the keyboard", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const hash = new URL(page.url()).hash;
  await page
    .getByRole("banner")
    .getByRole("button", { name: /^Catalogfore\b/ })
    .click();
  await expect(page.locator("#plan-inputs")).toBeFocused();
  expect(new URL(page.url()).hash).toBe(hash);
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");

  const menu = await openWorkspaceMenu(page);
  const open = menu.getByRole("menuitem", { name: /^Open forecast\b/ });
  await open.focus();
  const cancelled = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (await cancelled).setFiles([]);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(workspaceMenuTrigger(page)).toBeFocused();
  expect(new URL(page.url()).hash).toBe(hash);

  await openWorkspaceMenu(page);
  await open.focus();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (await chooser).setFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /forecast|portfolio/i })
      .first(),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe(hash);
});

test("starting a new forecast is explicit and can be undone", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const before = await page.getByTestId("year-sentence").innerText();
  await selectWorkspaceAction(page, "New forecast");
  await expect(page.getByRole("radio", { name: "3%", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#plan-inputs")).toBeFocused();
  await page.getByRole("button", { name: "Undo last change", exact: true }).click();
  await expect(page.getByTestId("year-sentence")).toHaveText(before);
});

test("narrow mobile navigation reveals the forecast and returns to inputs @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("./");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const hash = new URL(page.url()).hash;
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const presetBounds = await page.getByRole("radio", { name: /^(Small|Medium|Large)/ }).evaluateAll((options) =>
    options.map((option) => ({
      left: option.getBoundingClientRect().left,
      right: option.getBoundingClientRect().right,
    })),
  );
  expect(presetBounds).toHaveLength(3);
  expect(presetBounds.every(({ left, right }) => left >= 0 && right <= 320)).toBe(true);
  const shortcut = page.getByRole("complementary", { name: "Forecast shortcut" });
  await shortcut.getByRole("button", { name: "View forecast", exact: true }).click();
  await expect(page.locator("#forecast")).toBeFocused();
  await expect(page.locator("#forecast")).toBeInViewport({ ratio: 0.05 });
  const boxes = await page
    .getByRole("tablist", { name: "Forecast views" })
    .getByRole("tab")
    .evaluateAll((tabs) =>
      tabs.map((tab) => ({
        x: Math.round(tab.getBoundingClientRect().x),
        y: Math.round(tab.getBoundingClientRect().y),
      })),
    );
  expect(new Set(boxes.map(({ x }) => x)).size).toBe(2);
  expect(new Set(boxes.map(({ y }) => y)).size).toBe(2);
  await shortcut.getByRole("button", { name: "Edit inputs", exact: true }).click();
  await expect(page.locator("#plan-inputs")).toBeFocused();
  expect(new URL(page.url()).hash).toBe(hash);
});

test("billing review keeps its action visible and exposes accessible scroll regions", async ({ page }) => {
  await page.goto("./");
  await page.getByText("Use my real usage", { exact: true }).click();
  await page.getByRole("button", { name: "Load history sample", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review usage import" });
  const apply = dialog.getByRole("button", { name: "Use this baseline", exact: true });
  await expect(apply).toBeInViewport();
  const products = dialog.getByRole("region", { name: "Selected product details" });
  await products.focus();
  await expect(products).toBeFocused();
  await expect(apply).toBeInViewport();
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});
