import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { exportText, savedDownload, uploadUsage } from "./forecast-helpers";
import { navigateWorkspace, selectWorkspaceAction } from "./header-helpers";

test("CSV and JSON download failures explain the problem and recover on retry", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  for (const format of ["CSV", "JSON"] as const) {
    await page.evaluate(() => {
      const createObjectURL = URL.createObjectURL.bind(URL);
      let failOnce = true;
      URL.createObjectURL = (blob) => {
        if (failOnce) {
          failOnce = false;
          throw new Error("Browser download temporarily unavailable");
        }
        return createObjectURL(blob);
      };
    });
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page.getByRole("menuitem", { name: new RegExp(`^${format}\\b`) }).click();
    await expect(page.getByRole("alert")).toHaveText(`The ${format} file did not download. Try again.`);
    expect((await exportText(page, format)).length).toBeGreaterThan(100);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("PDF and Excel downloads return keyboard focus to the export control", async ({ page }) => {
  await page.goto("./");
  for (const format of ["PDF", "XLSX"] as const) {
    const trigger = page.getByRole("button", { name: "Export", exact: true });
    await trigger.focus();
    await trigger.press("Enter");
    const item = page.getByRole("menuitem", { name: new RegExp(`^${format}\\b`) });
    await item.focus();
    const pending = page.waitForEvent("download");
    await item.press("Enter");
    const download = await pending;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
    await expect(trigger).toBeFocused();
  }
});

test("opening valid saved JSON clears earlier file errors and keeps its forecast", async ({ page }) => {
  await page.goto("./");
  const saved = await savedDownload(page);
  await page.getByRole("button", { name: "Use my real usage", exact: true }).click();
  await page.getByLabel("Usage CSV", { exact: true }).setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("not,usage\nhello,world"),
  });
  await expect(page.getByRole("alert")).toContainText("invalid dates");
  const open = page.getByLabel("Open a saved forecast", { exact: true });
  await open.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.locator("#forecast").getByRole("status")).toContainText("version is not supported");
  expect((await savedDownload(page)).annual).toBe(saved.annual);
  const restored = { ...saved.portfolio, name: "Recovered forecast" };
  await open.setInputFiles({
    name: "recovered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(restored)),
  });
  await expect(page.locator("#forecast").getByRole("status")).toHaveText("Opened Recovered forecast.");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await savedDownload(page)).annual).toBe(saved.annual);
});

test("a delayed saved file cannot overwrite a later file or a new forecast", async ({ page }) => {
  await page.addInitScript(() => {
    const readText = File.prototype.text;
    File.prototype.text = async function () {
      if (this.name.startsWith("delayed-")) {
        document.documentElement.dataset.pendingRead = this.name;
        await new Promise<void>((resolve) =>
          window.addEventListener("release-file-read", () => resolve(), { once: true }),
        );
      }
      return readText.call(this);
    };
  });
  await page.goto("./");
  const initial = await savedDownload(page);
  const open = page.getByLabel("Open a saved forecast", { exact: true });
  const delayed = {
    name: "delayed-first.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...initial.portfolio, name: "Earlier file", budgetAnnual: 1111 })),
  };
  await open.setInputFiles(delayed);
  await expect(page.locator("html")).toHaveAttribute("data-pending-read", delayed.name);
  await open.setInputFiles({
    name: "latest.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...initial.portfolio, name: "Latest file", budgetAnnual: 2222 })),
  });
  await expect(page.locator("#forecast").getByRole("status")).toHaveText("Opened Latest file.");
  await page.evaluate(() => window.dispatchEvent(new Event("release-file-read")));
  expect((await savedDownload(page)).portfolio.budgetAnnual).toBe(2222);
  await expect(page.locator("#forecast").getByRole("status")).toHaveText("Opened Latest file.");

  await open.setInputFiles({ ...delayed, name: "delayed-second.json" });
  await expect(page.locator("html")).toHaveAttribute("data-pending-read", "delayed-second.json");
  await selectWorkspaceAction(page, "New forecast");
  await page.evaluate(() => window.dispatchEvent(new Event("release-file-read")));
  expect((await savedDownload(page)).portfolio.budgetAnnual).toBeUndefined();
  expect((await savedDownload(page)).portfolio.name).not.toBe("Earlier file");
});

test("cancelling a sample restores keyboard focus and does not reappear through browser history", async ({ page }) => {
  await page.goto("./?view=products");
  await navigateWorkspace(page, "Plan");
  const opener = page.getByRole("button", { name: "Use my real usage", exact: true });
  await opener.click();
  const hash = new URL(page.url()).hash;
  const sample = page.getByRole("button", { name: "Load a sample", exact: true });
  await sample.focus();
  await sample.press("Enter");
  const review = page.getByRole("dialog", { name: "Review usage import", exact: true });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Cancel import", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(review).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator("#forecast").getByRole("status")).toHaveText(
    "Import cancelled. Your forecast is unchanged.",
  );
  expect(new URL(page.url()).hash).toBe(hash);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Product map", exact: true })).toBeVisible();
  await page.goForward();
  await expect(opener).toBeVisible();
  await expect(review).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe(hash);
});

test("cancelling a nested import returns focus inside Advanced and preserves the plan", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  const advanced = page.getByRole("dialog", { name: "Advanced", exact: true });
  const hash = new URL(page.url()).hash;
  await advanced.getByLabel("Usage CSV", { exact: true }).setInputFiles({
    name: "usage.csv",
    mimeType: "text/csv",
    buffer: await readFile(new URL("../apps/web/public/sample-usage.csv", import.meta.url)),
  });
  await expect(page.getByRole("dialog", { name: "Review usage import", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Review usage import", exact: true })).toHaveCount(0);
  await expect(advanced).toBeVisible();
  await expect(advanced.getByRole("button", { name: "From a usage file", exact: true })).toBeFocused();
  expect(new URL(page.url()).hash).toBe(hash);
});

test("Advanced reports failed CSV reads in its dialog and accepts a corrected file", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  const advanced = page.getByRole("dialog", { name: "Advanced", exact: true });
  const upload = advanced.getByLabel("Usage CSV", { exact: true });
  await upload.setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("not,usage\nhello,world"),
  });
  await expect(advanced.getByRole("alert")).toContainText("invalid dates");
  const hash = new URL(page.url()).hash;
  await upload.setInputFiles({
    name: "corrected.csv",
    mimeType: "text/csv",
    buffer: await readFile(new URL("../apps/web/public/sample-usage.csv", import.meta.url)),
  });
  const review = page.getByRole("dialog", { name: "Review usage import", exact: true });
  await expect(review).toBeVisible();
  await expect(review.getByRole("alert")).toHaveCount(0);
  await review.getByRole("button", { name: "Cancel import", exact: true }).click();
  await expect(advanced.getByRole("alert")).toHaveCount(0);
  await expect(advanced.getByRole("button", { name: "From a usage file", exact: true })).toBeFocused();
  expect(new URL(page.url()).hash).toBe(hash);
});

test("a copied imported plan preserves costs and omits ownership labels", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await uploadUsage(
    page,
    "usage_date,sku_name,usage_quantity,usage_unit,list_price,cloud,identity_metadata.owned_by\n2026-09-15,JOBS_COMPUTE,100,DBU,0.1,AWS,budget-owner@example.com",
  );
  await page.getByRole("button", { name: "Use this baseline", exact: true }).click();
  const imported = await savedDownload(page);
  expect(imported.portfolio.usage?.attribution?.[0]?.label).toBe("budget-owner@example.com");
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.locator("#forecast").getByRole("status")).toHaveText("Link copied");
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  const shared = await context.newPage();
  await shared.goto(sharedUrl);
  const reopened = await savedDownload(shared);
  expect(reopened.annual).toBe(imported.annual);
  expect(reopened.forecast).toEqual(imported.forecast);
  expect(reopened.portfolio.usage?.attribution).toBeUndefined();
  await shared.close();
});
