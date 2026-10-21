import { expect, test } from "@playwright/test";

test("quick inputs retain the requested amount and commit with Enter", async ({ page }) => {
  await page.goto("./");
  const spend = page.getByRole("textbox", { name: "Starting monthly spend" });
  await expect(spend).toHaveValue("12000");
  const sentence = page.getByTestId("year-sentence");
  const initial = await sentence.innerText();
  await spend.fill("$5,000.50");
  await spend.press("Enter");
  await expect(spend).toHaveValue("5000.5");
  await expect(sentence).not.toHaveText(initial);
  const valid = await sentence.innerText();

  await spend.fill("-1");
  await spend.press("Enter");
  await expect(spend).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toContainText("Enter a monthly spend");
  await expect(spend).toHaveValue("-1");
  await expect(sentence).toHaveText(valid);
  await spend.fill("");
  await spend.press("Enter");
  await expect(spend).toHaveAttribute("aria-invalid", "true");
  await expect(sentence).toHaveText(valid);

  await spend.fill("0");
  await spend.press("Enter");
  await expect(spend).toHaveAttribute("aria-invalid", "false");
  await expect(sentence).toHaveText("About $0 per year. Planning range $0 to $0.");
});

test("custom monthly growth explains invalid drafts and supports negative growth", async ({ page }) => {
  await page.goto("./");
  const growth = page.getByRole("textbox", { name: "Custom monthly growth" });
  const sentence = page.getByTestId("year-sentence");
  const initial = await sentence.innerText();
  await growth.fill("21");
  await growth.press("Enter");
  await expect(growth).toHaveAttribute("aria-invalid", "true");
  await expect(growth).toHaveValue("21");
  await expect(page.getByRole("alert")).toHaveText("Enter monthly growth from −20% to 20%.");
  await expect(sentence).toHaveText(initial);
  await growth.fill("-5");
  await growth.press("Enter");
  await expect(growth).toHaveAttribute("aria-invalid", "false");
  await expect(growth).toHaveValue("-5");
  await expect(sentence).not.toHaveText(initial);
});

test("advanced editing brings selected workloads into view and restores keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  const first = page.getByRole("button", { name: /^Pipelines and jobs/ });
  await first.focus();
  await first.press("Enter");
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toBeFocused();
  const bounds = await name.boundingBox();
  expect(bounds?.y).toBeGreaterThanOrEqual(0);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThan(700);
  await page
    .getByRole("group", { name: "Edit Pipelines and jobs", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(first).toBeFocused();
  await first.press("Enter");
  await expect(name).toBeFocused();
  await page
    .getByRole("group", { name: "Edit Pipelines and jobs", exact: true })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Dashboards/ })).toBeFocused();

  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const picker = page.getByRole("region", { name: "Choose a product", exact: true });
  await expect(picker).toBeFocused();
  const pickerBounds = await picker.boundingBox();
  expect(pickerBounds?.x).toBeGreaterThanOrEqual(0);
  expect((pickerBounds?.x ?? 0) + (pickerBounds?.width ?? 0)).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveAttribute("data-state", "open");
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Add product", exact: true }).press("Enter");
  const product = page.getByRole("button", { name: /Serverless jobs/ });
  await product.focus();
  await product.press("Enter");
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("Serverless jobs");
  const dialogOverflow = await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth);
  expect(dialogOverflow).toBeLessThanOrEqual(1);
});
