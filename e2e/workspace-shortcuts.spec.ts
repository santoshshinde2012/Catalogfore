import { expect, test } from "@playwright/test";
import { selectWorkspaceAction, workspaceMenuTrigger } from "./header-helpers";

test("keyboard help returns focus to its menu trigger and keeps navigation inside the dialog", async ({ page }) => {
  await page.goto("./");
  await selectWorkspaceAction(page, "Keyboard shortcuts");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  const plannerUrl = page.url();
  await page.keyboard.press("Alt+2");
  expect(page.url()).toBe(plannerUrl);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("?");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(workspaceMenuTrigger(page)).toBeFocused();
  await page.keyboard.press("Alt+2");
  await expect(page.getByRole("heading", { name: "Product map", exact: true })).toBeVisible();
});

test("help opened with a question mark returns focus to the original control", async ({ page }) => {
  await page.goto("./");
  const menu = workspaceMenuTrigger(page);
  await menu.focus();
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("?");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(menu).toBeFocused();
});
