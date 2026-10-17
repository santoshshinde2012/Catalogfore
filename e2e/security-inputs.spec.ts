import { expect, test } from "@playwright/test";

test("a malformed compressed share link recovers to an interactive planner", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./#plan=y");
  // A rewritten share fragment proves the client recovered beyond the static landing HTML.
  await expect.poll(() => new URL(page.url()).hash).not.toBe("#plan=y");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const total = page.getByTestId("year-sentence");
  const initial = await total.innerText();
  const growth = page.getByRole("radio", { name: "10%", exact: true });
  await growth.click();
  await expect(growth).toHaveAttribute("aria-checked", "true");
  await expect(total).not.toHaveText(initial);
  expect(errors).toEqual([]);
});
