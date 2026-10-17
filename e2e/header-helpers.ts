import { expect, type Page } from "@playwright/test";

export function workspaceMenuTrigger(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: "Menu", exact: true });
}

export async function openWorkspaceMenu(page: Page) {
  await workspaceMenuTrigger(page).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

export async function selectWorkspaceAction(page: Page, name: string) {
  const menu = await openWorkspaceMenu(page);
  await menu.getByRole("menuitem", { name: new RegExp(`^${name}\\b`) }).click();
  await expect(menu).toHaveCount(0);
}

export async function navigateWorkspace(page: Page, name: "Plan" | "Product map" | "Unit costs") {
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}

export async function selectTheme(page: Page, theme: "light" | "dark") {
  await selectWorkspaceAction(page, `Switch to ${theme} theme`);
  if (theme === "dark") await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  else await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
}
