import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";
import { openWorkspaceMenu, selectTheme, selectWorkspaceAction, workspaceMenuTrigger } from "./header-helpers";

async function expectTooltipOnScreen(tooltip: Locator) {
  await expect(tooltip).toBeVisible();
  // WebKit's IntersectionObserver misreports fixed descendants of sticky
  // headers after scrolling. Bounds and hit-testing detect actual clipping.
  await expect
    .poll(() =>
      tooltip.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= innerWidth &&
          box.bottom <= innerHeight &&
          element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      }),
    )
    .toBe(true);
}

test("field help opens on activation and dismisses without changing the plan", async ({ page, isMobile }) => {
  await page.goto("./");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const before = new URL(page.url()).hash;
  const help = page.getByRole("button", { name: "Help: Cloud", exact: true });
  if (isMobile) await help.tap();
  else await help.click();
  const tooltip = page.getByRole("tooltip", { name: /^Cloud\b/ });
  await expect(tooltip).toBeVisible();
  await expect(help).toHaveAttribute("aria-expanded", "true");
  await expect(help).toHaveAccessibleDescription(/Sets the cloud, edition, and region/);
  const heading = page.getByRole("heading", { name: "What does the next year cost?", exact: true });
  if (isMobile) await heading.tap();
  else await heading.click();
  await expect(tooltip).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe(before);
  await help.press("Enter");
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
});

test("field help remains available on hover and keyboard focus", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer hover applies to desktop help.");
  await page.goto("./");
  const help = page.getByRole("button", { name: "Help: Cloud", exact: true });
  const tooltip = page.getByRole("tooltip", { name: /^Cloud\b/ });
  await help.hover();
  await expect(tooltip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await help.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
});

test("open field help has one accessible description in light and dark themes", async ({ page, isMobile }) => {
  await page.goto("./");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") await selectTheme(page, theme);
    const help = page.getByRole("button", { name: "Help: Cloud", exact: true });
    // Use touch on phones: WebKit can scroll after a synthetic focus(), which
    // correctly dismisses tooltips. A tap settles that scroll before opening.
    if (isMobile) await help.tap();
    else await help.focus();
    await expect(page.getByRole("tooltip", { name: /^Cloud\b/ })).toBeVisible();
    await expect(help).toHaveAccessibleDescription(
      /Cloud.*Sets the cloud, edition, and region used to price new workloads. Prices follow the selected region./,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
  }
});

test("tooltips stay aligned with the sticky header and Advanced dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("./");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  await page.getByTestId("forecast-chart").locator("svg.recharts-surface").waitFor();
  await page.evaluate(async () => {
    window.scrollTo(0, 600);
    // WebKit delivers the scroll event asynchronously; finish scrolling before
    // opening help, which correctly dismisses itself when its page scrolls.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const menu = workspaceMenuTrigger(page);
  await menu.evaluate((button) => button.focus({ preventScroll: true }));
  const headerHelp = page.getByRole("banner").getByRole("tooltip", { name: /^Workspace menu\b/ });
  await expectTooltipOnScreen(headerHelp);
  const menuBox = (await menu.boundingBox())!;
  const helpBox = (await headerHelp.boundingBox())!;
  expect(Math.abs(helpBox.y - (menuBox.y + menuBox.height + 6))).toBeLessThan(2);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Advanced", exact: true });
  const add = dialog.getByRole("button", { name: "Add product", exact: true });
  await add.evaluate((button) => button.focus({ preventScroll: true }));
  const dialogHelp = dialog.getByRole("tooltip", { name: /^Add a Databricks product\b/ });
  await expectTooltipOnScreen(dialogHelp);
  const popupBox = (await dialogHelp.boundingBox())!;
  const dialogBox = (await dialog.boundingBox())!;
  expect(popupBox.x).toBeGreaterThanOrEqual(dialogBox.x);
  expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
  await expect(add).toHaveAccessibleDescription(/Choose a product, then set its usage and pricing assumptions/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("keyboard help fits a short viewport and its close control remains reachable", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 280 });
  await page.goto("./");
  await workspaceMenuTrigger(page).focus();
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(280);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(workspaceMenuTrigger(page)).toBeFocused();
});

test("printing keeps page headings and the entire forecast readable in either theme", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("./");
  await expect(page.getByTestId("forecast-chart")).toBeVisible();
  for (const theme of ["dark", "light"] as const) {
    await selectTheme(page, theme);
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("contentinfo")).toBeHidden();
    await expect(page.getByRole("heading", { name: "What does the next year cost?", exact: true })).toBeVisible();
    const results = page.getByRole("region", { name: "Forecast results", exact: true });
    await expect(results).toHaveCSS("max-height", "none");
    await expect(results).toHaveCSS("overflow-y", "visible");
    await expect(results.locator("..")).toHaveCSS("position", "static");
    await expect(page.locator("body")).toHaveCSS("color", "rgb(11, 32, 38)");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await page.emulateMedia({ media: "screen" });
  }
});

test("theme and print menu actions return keyboard focus to the menu", async ({ page }) => {
  await page.goto("./");
  await selectTheme(page, "dark");
  await expect(workspaceMenuTrigger(page)).toBeFocused();
  await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute("data-printed", "true");
  });
  await selectWorkspaceAction(page, "Print current view");
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  await expect(workspaceMenuTrigger(page)).toBeFocused();
  await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
});

test("workspace shortcuts leave open menus and region options in control", async ({ page }) => {
  await page.goto("./");
  const menu = await openWorkspaceMenu(page);
  await menu.getByRole("menuitem").first().focus();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toHaveCount(0);
  await page.keyboard.press("Alt+2");
  await expect(menu).toBeVisible();
  expect(new URL(page.url()).searchParams.get("view")).toBeNull();
  await page.keyboard.press("Escape");

  await page.getByRole("combobox", { name: "Region", exact: true }).click();
  const listbox = page.getByRole("listbox");
  await listbox.getByRole("option").first().focus();
  await page.keyboard.press("Alt+2");
  await expect(listbox).toBeVisible();
  expect(new URL(page.url()).searchParams.get("view")).toBeNull();
  await page.keyboard.press("Escape");
});
