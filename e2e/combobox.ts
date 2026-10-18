import { expect, type Page } from "@playwright/test";

export function combobox(page: Page, name: string, exact = true) {
  return page.getByRole("combobox", { name, exact });
}

function attributeValue(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}

/** Open a custom select and choose the option stored in `data-value`. */
export async function chooseOption(page: Page, name: string, value: string, exact = true) {
  await combobox(page, name, exact).click();
  await page.locator(`[role="option"][data-value="${attributeValue(value)}"]`).click();
}

/** Open a custom select and choose an option by its visible name. */
export async function chooseOptionByName(page: Page, name: string, option: string, exact = true) {
  await combobox(page, name, exact).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function expectComboboxValue(page: Page, name: string, value: string, exact = true) {
  await expect(combobox(page, name, exact)).toHaveAttribute("data-value", value);
}
