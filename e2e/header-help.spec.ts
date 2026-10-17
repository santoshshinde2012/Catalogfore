import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("every desktop header action explains itself on hover and keyboard focus", async ({ page, isMobile }) => {
  test.skip(isMobile, "Hover help is tested with a mouse; touch help is visible inside the menu.");
  await page.goto("./");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#plan=/);
  const header = page.getByRole("banner");
  const actions = [
    header.getByRole("button", { name: /^Cayfore\b/ }),
    header.getByRole("button", { name: "Plan", exact: true }),
    header.getByRole("button", { name: "Forecast", exact: true }),
    header.getByRole("button", { name: "Advanced", exact: true }),
    header.getByRole("button", { name: "Product map", exact: true }),
    header.getByRole("button", { name: "Unit costs", exact: true }),
    header.getByRole("button", { name: "How it works", exact: true }),
    header.getByRole("link", { name: "Star on GitHub", exact: true }),
    header.getByRole("button", { name: "Switch to dark theme", exact: true }),
    header.getByRole("button", { name: "Open forecast", exact: true }),
    header.getByRole("button", { name: "Menu", exact: true }),
  ];
  const initialHash = new URL(page.url()).hash;

  for (const action of actions) {
    await action.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(action).toHaveAccessibleDescription(/.{20}/);
    await page.mouse.move(page.viewportSize()!.width - 4, 4, { steps: 5 });
    await expect(page.getByRole("tooltip")).toHaveCount(0);

    await action.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(action).toHaveAccessibleDescription(/.{20}/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(action).toBeFocused();
  }

  await expect(header.getByRole("button", { name: "Advanced", exact: true })).toHaveAttribute(
    "aria-haspopup",
    "dialog",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  expect(new URL(page.url()).hash).toBe(initialHash);
});

test("keyboard menu navigation moves to the forecast and Escape restores its trigger", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const hash = new URL(page.url()).hash;
  const menuTrigger = page.getByRole("banner").getByRole("button", { name: "Menu", exact: true });
  await menuTrigger.focus();
  await menuTrigger.press("Enter");
  await expect(menuTrigger).toHaveAttribute("data-state", "open");
  await expect(page.getByRole("menuitem", { name: /^Edit inputs\b/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^Forecast\b/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.locator("#forecast")).toBeFocused();
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
  expect(new URL(page.url()).hash).toBe(hash);

  await menuTrigger.focus();
  await menuTrigger.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(menuTrigger).toBeFocused();
});

test("touch menu explains its actions and fits a narrow screen @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("./");
  await page.getByRole("banner").getByRole("button", { name: "Menu", exact: true }).tap();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /^Edit inputs\b/ })).toContainText(
    "Choose your cloud, baseline spend, and growth assumptions.",
  );
  await expect(menu.getByRole("menuitem", { name: /^Forecast\b/ })).toContainText(
    "Explore monthly spend, cost drivers, and your 12-month outlook.",
  );
  for (const name of [
    "Edit inputs",
    "Forecast",
    "Advanced",
    "Product map",
    "Unit costs",
    "How it works",
    "New forecast",
  ]) {
    const action = menu.getByRole("menuitem", { name: new RegExp(`^${name}\\b`) });
    await expect(action).toBeVisible();
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeInViewport();
    // Each action exposes the explanation through visible text and its accessible name.
    expect((await action.innerText()).replace(name, "").trim().length).toBeGreaterThan(20);
    await expect(action).toHaveAccessibleName(new RegExp(`^${name}\\b.{20,}`));
    const bounds = await action.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await menu.getByRole("menuitem", { name: /^Edit inputs\b/ }).focus();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: /^New forecast\b/ })).toBeFocused();
  await expect(menu.getByRole("menuitem", { name: /^New forecast\b/ })).toBeInViewport();
  expect(await menu.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});

test("chart and export help preserve keyboard tab navigation and accessible menus", async ({ page }) => {
  await page.goto("./");
  const views = page.getByRole("tablist", { name: "Forecast views" });
  const chart = views.getByRole("tab", { name: "Chart", exact: true });
  await chart.scrollIntoViewIfNeeded();
  // Let the scroll event complete before checking help that intentionally closes on scroll.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await chart.focus();
  await expect(page.getByRole("tooltip", { name: /^Monthly spend\b/ })).toBeVisible();
  await expect(chart).toHaveAccessibleDescription(/Explore forecast costs by month/);
  await chart.press("ArrowRight");
  const cumulative = views.getByRole("tab", { name: "Cumulative", exact: true });
  await expect(cumulative).toBeFocused();
  await expect(cumulative).toHaveAttribute("aria-selected", "true");
  await expect(cumulative).toHaveAttribute("data-state", "active");
  await expect(cumulative.locator('span[aria-hidden="true"]').last()).toHaveCSS("height", "2px");
  await expect(chart.locator('span[aria-hidden="true"]')).toHaveCount(0);
  await expect(page.getByRole("tabpanel", { name: "Cumulative", exact: true })).toBeVisible();
  await expect(page.getByRole("tooltip", { name: /^Cumulative spend\b/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(cumulative).toBeFocused();

  const exportTrigger = page.getByRole("button", { name: "Export", exact: true });
  await exportTrigger.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await exportTrigger.focus();
  await expect(page.getByRole("tooltip", { name: /^Download your forecast\b/ })).toBeVisible();
  await expect(exportTrigger).toHaveAccessibleDescription(
    /Excel workbook, CSV spreadsheet, JSON data, or a PDF report/,
  );
  await exportTrigger.press("Enter");
  await expect(exportTrigger).toHaveAttribute("data-state", "open");
  const exports = page.getByRole("region", { name: "Forecast export", exact: true });
  const menu = exports.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /^XLSX\b/ })).toContainText(
    "Excel workbook with formulas, rates, and sources",
  );
  await expect(menu.getByRole("menuitem", { name: /^CSV\b/ })).toContainText(
    "Costs and monthly forecasts for spreadsheets",
  );
  await expect(menu.getByRole("menuitem", { name: /^JSON\b/ })).toContainText("Complete forecast data and assumptions");
  await expect(menu.getByRole("menuitem", { name: /^PDF\b/ })).toContainText(
    "Shareable report with costs and assumptions",
  );
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(exportTrigger).toBeFocused();
});

test("Escape closes the product chooser, then Advanced without reopening help", async ({ page, isMobile }) => {
  await page.goto("./");
  const header = page.getByRole("banner");
  if (isMobile) {
    await header.getByRole("button", { name: "Menu", exact: true }).tap();
    await page.getByRole("menuitem", { name: /^Advanced\b/ }).tap();
  } else {
    await header.getByRole("button", { name: "Advanced", exact: true }).click();
  }
  const advanced = page.getByRole("dialog", { name: "Advanced", exact: true });
  await expect(advanced).toBeVisible();
  const addProduct = advanced.getByRole("button", { name: "Add product", exact: true });
  await addProduct.click();
  const chooser = advanced.getByRole("region", { name: "Choose a product", exact: true });
  await expect(chooser).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(chooser).toHaveCount(0);
  await expect(addProduct).toBeFocused();
  await expect(advanced).toHaveAttribute("data-state", "open");
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(advanced).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toBeVisible();
});
