import { expect, test } from "@playwright/test";
import { navigateWorkspace } from "./header-helpers";

test("a failed workspace download keeps the plan recoverable and supports retry", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  const hash = new URL(page.url()).hash;
  const module = /\/products\/ProductMapPage\.tsx|\/assets\/ProductMapPage-[^/]+\.js/;
  await page.route(module, (route) => route.abort("failed"));
  await navigateWorkspace(page, "Product map");
  await expect(page.getByRole("heading", { name: "This view couldn’t load", exact: true })).toBeVisible();
  await expect(page.locator("#workspace-error")).toBeFocused();
  await expect(page.getByRole("banner")).toBeVisible();
  expect(new URL(page.url()).hash).toBe(hash);
  await page.getByRole("button", { name: "Return to plan", exact: true }).click();
  await expect(page.locator("#plan-inputs")).toBeFocused();
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
  await navigateWorkspace(page, "Product map");
  await expect(page.locator("#workspace-error")).toBeVisible();
  await page.unroute(module);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("#product-map")).toBeVisible();
  expect(new URL(page.url()).hash).toBe(hash);
  await navigateWorkspace(page, "Plan");
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
});
