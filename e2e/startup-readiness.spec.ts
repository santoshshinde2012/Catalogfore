import { expect, test } from "@playwright/test";

test("controls wait for the planner to start, then the first edit is retained", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/(?:src\/main\.tsx|assets\/index-[\w-]+\.js)(?:\?.*)?$/, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("./", { waitUntil: "commit" });
    await expect(page.getByRole("status").filter({ hasText: "Starting planner" })).toBeVisible();
    await expect(page.locator("#root")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    expect(
      await page.locator("#root").evaluate((root) => {
        root.querySelector("button")?.focus();
        return root.contains(document.activeElement);
      }),
    ).toBe(false);
  } finally {
    release();
  }
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  await expect(page.locator("#root")).not.toHaveAttribute("aria-busy");
  await expect(page.locator("#startup-status")).toHaveCount(0);
  const original = await page.getByTestId("year-sentence").textContent();
  await page.getByRole("radio", { name: "Azure", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Azure", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("year-sentence")).not.toHaveText(original!);
  await page.reload();
  await expect(page.getByRole("radio", { name: "Azure", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("blocked browser storage still starts an editable planner without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      Storage.prototype[method] = () => {
        throw new DOMException("Storage blocked", "SecurityError");
      };
    }
  });
  await page.goto("./");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await expect(page.getByRole("radio", { name: "10%", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#startup-status")).toHaveCount(0);
  expect(errors).toEqual([]);
});
