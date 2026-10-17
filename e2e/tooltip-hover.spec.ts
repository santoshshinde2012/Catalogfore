import { expect, test } from "@playwright/test";

test("help stays readable on hover and closes when the pointer leaves under slow rendering", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Pointer transit applies to desktop hover help.");
  await page.goto("./");
  const menu = page.getByRole("banner").getByRole("button", { name: "Menu", exact: true });
  const help = page.getByRole("tooltip", { name: /^Workspace menu\b/ });

  await menu.focus();
  await expect(help).toBeVisible();
  await page.mouse.move(4, page.viewportSize()!.height - 4);
  await expect(help).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toHaveCount(0);

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  try {
    await menu.hover();
    await expect(help).toBeVisible();
    await help.hover();
    await expect(help).toBeVisible();
    await expect(menu).toHaveAccessibleDescription(/Open saved forecasts, edit workloads, and manage your workspace/);
    await page.mouse.move(page.viewportSize()!.width - 4, page.viewportSize()!.height - 4, { steps: 5 });
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  } finally {
    await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await session.detach();
  }
});
