import { expect, test } from "@playwright/test";
import { chooseOptionByName } from "./combobox";
import { savedDownload, uploadUsage } from "./forecast-helpers";

test("advanced names preserve spaces and invalid quantities leave the saved workload unchanged", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("button", { name: /^Pipelines and jobs/ }).click();
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("");
  await name.pressSequentially("Sales Analytics");
  await expect(name).toHaveValue("Sales Analytics");
  await name.press("Enter");
  const savedUrl = page.url();
  const hours = page.getByRole("spinbutton", { name: "Hours / day", exact: true });
  for (const draft of ["", "25", "-1"]) {
    await hours.fill(draft);
    await hours.press("Enter");
    await expect(hours).toHaveValue(draft);
    await expect(hours).toHaveAttribute("aria-invalid", "true");
    expect(page.url()).toBe(savedUrl);
  }
  const minimum = page.getByRole("spinbutton", { name: "Min workers", exact: true });
  const maximum = Number(await page.getByRole("spinbutton", { name: "Max workers", exact: true }).inputValue());
  await minimum.fill(String(maximum + 1));
  await minimum.press("Enter");
  await expect(minimum).toHaveAttribute("aria-invalid", "true");
  expect(page.url()).toBe(savedUrl);
  await page.getByRole("button", { name: /^Dashboards/ }).click();
  await expect(page.getByRole("spinbutton", { name: "Min clusters", exact: true })).toHaveAttribute(
    "aria-invalid",
    "false",
  );
  await page.getByRole("button", { name: /^Sales Analytics/ }).click();
  await expect(hours).toHaveValue("8");
  await expect(hours).toHaveAttribute("aria-invalid", "false");
  await hours.fill("6.5");
  await hours.press("Enter");
  await page.keyboard.press("Escape");
  const saved = await savedDownload(page);
  expect(saved.portfolio.workloads[0]).toMatchObject({ name: "Sales Analytics", schedule: { hoursPerDay: 6.5 } });
  await page.reload();
  expect((await savedDownload(page)).portfolio).toEqual(saved.portfolio);
});

test("contract source edits retain the custom rate and closing Advanced commits a valid draft", async ({ page }) => {
  await page.goto("./");
  const { portfolio } = await savedDownload(page);
  delete portfolio.simple;
  portfolio.forecast.annualGrowth = 0;
  portfolio.workloads = [
    { id: "contract", name: "Contract DBUs", kind: "metered", sku: "jobs_serverless", dbuPerMonth: 100 },
  ];
  await page.getByLabel("Open a saved forecast").setInputFiles({
    name: "contract.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "cayfore.forecast", version: 1, portfolio })),
  });
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByText("Contract rate override", { exact: true }).click();
  const rate = page.getByRole("spinbutton", { name: "USD per DBU", exact: true });
  await rate.fill("0.123");
  await rate.press("Enter");
  const source = page.getByRole("textbox", { name: "Rate source", exact: true });
  const savedUrl = page.url();
  await source.fill("");
  await source.press("Enter");
  await expect(source).toHaveAttribute("aria-invalid", "true");
  await expect(rate).toHaveValue("0.123");
  expect(page.url()).toBe(savedUrl);
  await source.fill("Procurement October 2026");
  await page.keyboard.press("Escape");
  const saved = await savedDownload(page);
  expect(saved.annual).toBeCloseTo(147.6, 2);
  expect(saved.portfolio.workloads[0].rateProvenance).toMatchObject({
    kind: "custom",
    label: "Procurement October 2026",
  });
  await page.reload();
  expect((await savedDownload(page)).annual).toBe(saved.annual);
});

test("duplicate, remove, and empty-workload recovery keep keyboard focus inside Advanced", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("button", { name: /^Pipelines and jobs/ }).click();
  await page
    .getByRole("group", { name: "Edit Pipelines and jobs", exact: true })
    .getByRole("button", { name: "Duplicate", exact: true })
    .click();
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("Pipelines and jobs copy");
  const longName = "ProductionBatch".repeat(5);
  await name.fill(longName);
  await name.press("Enter");
  expect(
    await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  await page
    .getByRole("group", { name: `Edit ${longName}`, exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.locator("button[data-workload-id]").last()).toBeFocused();
  while (await page.locator("button[data-workload-id]").count()) {
    await page.locator("button[data-workload-id]").first().click();
    await page
      .getByRole("group", { name: /^Edit / })
      .getByRole("button", { name: "Remove", exact: true })
      .click();
  }
  await expect(page.getByText("No workloads yet.", { exact: true })).toBeVisible();
  const add = page.getByRole("button", { name: "Add product", exact: true });
  await expect(add).toBeFocused();
  await add.press("Enter");
  await page
    .getByRole("region", { name: "Choose a product", exact: true })
    .getByRole("button", { name: /^Serverless jobs/ })
    .click();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("Serverless jobs");
  await name.fill(longName);
  await name.press("Enter");
  expect(
    await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth),
  ).toBeLessThanOrEqual(1);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByText("Inspect rates and assumptions", { exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
});

test("moving an individual cluster to another cloud selects a compatible machine", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("button", { name: /^Pipelines and jobs/ }).click();
  await page.getByText("Run this workload somewhere else", { exact: true }).click();
  await chooseOptionByName(page, "Region", "US West (Oregon)");
  await chooseOptionByName(page, "Cloud", "Azure", false);
  await expect(
    page.getByRole("status").filter({ hasText: "The default machine for this cloud is selected" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toContainText("Cloud default region");
  await page.keyboard.press("Escape");
  const saved = await savedDownload(page);
  const cluster = saved.portfolio.workloads[0];
  expect(cluster.cloud).toBe("azure");
  expect(cluster.region).toBeUndefined();
  expect(cluster.kind === "cluster" && cluster.instanceId.startsWith("Standard_")).toBe(true);
  await page.reload();
  expect((await savedDownload(page)).portfolio.workloads[0]).toEqual(cluster);
});

test("imported workload placement remains fixed to its billing source", async ({ page }) => {
  await page.goto("./");
  await uploadUsage(
    page,
    "usage_date,sku_name,usage_quantity,usage_unit,list_price,cloud\n2026-09-01,JOBS_COMPUTE,100,DBU,0.1,AWS",
  );
  await page.getByRole("button", { name: "Use this baseline", exact: true }).click();
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await expect(
    page.getByText("Cloud, region, and edition stay fixed to the imported source.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Run this workload somewhere else", { exact: true })).toHaveCount(0);
});

test("Advanced qualifies unresolved workload and product amounts as known costs", async ({ page }) => {
  await page.goto("./");
  const { portfolio } = await savedDownload(page);
  delete portfolio.simple;
  portfolio.cloud = "gcp";
  portfolio.region = "us-central1";
  portfolio.workloads = [
    {
      id: "unknown",
      name: "Unpriced database",
      kind: "lakebase",
      cu: 1,
      storageGb: 0,
      schedule: { hoursPerDay: 24, daysPerWeek: 7 },
    },
  ];
  await page.getByLabel("Open a saved forecast").setInputFiles({
    name: "unknown.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "cayfore.forecast", version: 1, portfolio })),
  });
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await expect(page.getByRole("button", { name: /^Unpriced database/ })).toContainText("$0.00 known");
  const totals = page.getByTestId("advanced-product-totals");
  await expect(totals).toContainText("Known costs only. Unresolved prices are excluded");
  await expect(totals).toContainText("$0.00 known / 12 mo");
  await expect(totals).toContainText("Known subtotal");
});
