import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { savedDownload } from "./forecast-helpers";
import { navigateWorkspace, openWorkspaceMenu, selectTheme } from "./header-helpers";

test("download notifications leave workspace navigation reachable", async ({ page, isMobile }) => {
  const viewports = [page.viewportSize()!];
  if (!isMobile) viewports.push({ width: 768, height: 720 });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await savedDownload(page);
    const notification = page.locator("[data-sonner-toast]").filter({ hasText: "JSON downloaded" });
    await expect(notification).toBeVisible();
    await notification.hover();
    await expect
      .poll(async () => {
        const header = await page.getByRole("banner").boundingBox();
        const toast = await notification.boundingBox();
        const shortcut = page.getByRole("complementary", { name: "Forecast shortcut", exact: true });
        const bar = (await shortcut.isVisible()) ? await shortcut.boundingBox() : null;
        return (
          !!header &&
          !!toast &&
          toast.y >= header.y + header.height &&
          toast.y + toast.height <= (bar?.y ?? viewport.height)
        );
      })
      .toBe(true);
    await navigateWorkspace(page, "Unit costs");
    await expect(page.getByRole("heading", { name: "Unit costs", exact: true })).toBeFocused();
    await expect(notification).toBeVisible();
    await notification.getByRole("button", { name: "Close toast", exact: true }).click();
    await expect(notification).toHaveCount(0);
  }
});

test("reference workspaces keep their return action and source context below the sticky header", async ({ page }) => {
  await page.goto("./");
  for (const name of ["Product map", "Unit costs"] as const) {
    await navigateWorkspace(page, name);
    await expect(page.getByRole("heading", { name, exact: true })).toBeFocused();
    const back = page.getByRole("button", { name: "Back to planner", exact: true });
    await expect(back).toBeInViewport();
    await expect
      .poll(async () => {
        const header = await page.getByRole("banner").boundingBox();
        const button = await back.boundingBox();
        return !!header && !!button && button.y >= header.y + header.height;
      })
      .toBe(true);
    if (name === "Unit costs") await expect(page.getByText(/^Source registry reviewed/)).toBeInViewport();
  }
});

test("Plan section links expose budget planning and preserve the current forecast", async ({ page }) => {
  await page.goto("./");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const original = page.url();
  const sections = page.getByRole("navigation", { name: "Plan sections", exact: true });
  await expect(sections).toBeInViewport();
  await sections.getByRole("link", { name: "Budget and scenarios", exact: true }).click();
  await expect(page.locator("#budget-planning")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("spinbutton", { name: "Annual budget", exact: true })).toBeFocused();
  expect(page.url()).toBe(original);
  await page.getByRole("textbox", { name: "Scenario name", exact: true }).fill("Starting plan");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Starting plan", exact: true })).toBeVisible();
  for (const [name, id] of [
    ["Forecast", "forecast"],
    ["Inputs", "plan-inputs"],
  ]) {
    await sections.getByRole("link", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toBeFocused();
    expect(page.url()).toBe(original);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("Help opens separately, follows the saved theme, and provides accessible task guidance", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await selectTheme(page, "dark");
  const original = page.url();
  const errors: string[] = [];
  const menu = await openWorkspaceMenu(page);
  const popup = page.waitForEvent("popup");
  await menu.getByRole("menuitem", { name: /^Help & FAQ\b/ }).click();
  const help = await popup;
  help.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await help.waitForLoadState();
  await expect(help).toHaveURL(/\/faq\.html$/);
  await expect(help.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(help.getByRole("heading", { name: "Help & FAQ", exact: true })).toBeVisible();
  await help.getByRole("link", { name: "Save and share", exact: true }).click();
  await expect(help.locator("#save-share")).toBeInViewport();
  const questions = await help.locator("main section h2").allTextContents();
  const schema = JSON.parse(await help.locator('script[type="application/ld+json"]').innerText());
  expect(schema.mainEntity.map((entry: { name: string }) => entry.name)).toEqual(questions);
  expect((await new AxeBuilder({ page: help }).analyze()).violations).toEqual([]);
  expect(await help.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
  await help.close();
  expect(page.url()).toBe(original);
  const footerHelp = page
    .getByRole("navigation", { name: "Footer", exact: true })
    .getByRole("link", { name: /^Help & FAQ/ });
  await expect(footerHelp).toHaveAttribute("href", "/Catalogfore/faq.html");
  await expect(footerHelp).toHaveAttribute("target", "_blank");
});
