import { expect, test } from "@playwright/test";
import { chooseOptionByName } from "./combobox";

test("budget shortcut preserves the shared plan URL and moves keyboard focus to planning", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#root")).not.toHaveAttribute("aria-busy", "true");
  const url = page.url();
  await page.getByRole("button", { name: "Budget and scenarios", exact: true }).click();
  await expect(page.locator("#budget-planning")).toBeFocused();
  expect(page.url()).toBe(url);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("spinbutton", { name: "Annual budget", exact: true })).toBeFocused();
});

test("scenario deletion undo restores comparison, keeps later saves, and returns keyboard focus", async ({ page }) => {
  await page.goto("./");
  const name = page.getByRole("textbox", { name: "Scenario name", exact: true });
  for (const title of ["Baseline", "Alternative"]) {
    await name.fill(title);
    await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  }
  await chooseOptionByName(page, "Compare scenario", "Baseline", false);
  await page.getByRole("button", { name: "Delete Baseline", exact: true }).click();
  await expect(name).toBeFocused();
  await expect(page.getByTestId("scenario-delta")).toHaveCount(0);
  await name.fill("Later plan");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await page.getByRole("button", { name: "Undo scenario deletion", exact: true }).click();
  await expect(name).toBeFocused();
  await expect(page.getByTestId("scenario-delta")).toContainText("Baseline");
  const controls = page.getByRole("region", { name: "Saved scenarios", exact: true });
  expect(
    await controls
      .getByRole("button", { name: /^Open / })
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label"))),
  ).toEqual(["Open Baseline", "Open Alternative", "Open Later plan"]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Baseline", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Later plan", exact: true })).toBeVisible();
});

test("scenario storage failures show a nearby recovery notice without losing session plans", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cayfore:scenarios:v1" && !document.documentElement.hasAttribute("data-storage-recovered"))
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return setItem.call(this, key, value);
    };
  });
  await page.goto("./");
  const controls = page.getByRole("region", { name: "Saved scenarios", exact: true });
  const name = page.getByRole("textbox", { name: "Scenario name", exact: true });
  await name.fill("Session baseline");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await expect(controls.getByRole("alert")).toContainText("Session only: browser storage is unavailable or full");
  await expect(page.getByRole("button", { name: "Open Session baseline", exact: true })).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute("data-storage-recovered", ""));
  await name.fill("Recovered plan");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await expect(controls.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Session baseline", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Recovered plan", exact: true })).toBeVisible();
});
