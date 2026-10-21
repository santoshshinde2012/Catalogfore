import { expect, test } from "@playwright/test";
import { savedDownload } from "./forecast-helpers";

test("an explicit contract rate keeps its source and dollars through save and reload", async ({ page }) => {
  await page.goto("./");
  const { portfolio } = await savedDownload(page);
  delete portfolio.simple;
  portfolio.forecast.annualGrowth = 0;
  portfolio.workloads = [
    { id: "contract-meter", name: "Contract DBUs", kind: "metered", sku: "jobs_serverless", dbuPerMonth: 100 },
  ];
  await page.getByLabel("Open a saved forecast").setInputFiles({
    name: "meter.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "cayfore.forecast", version: 1, portfolio })),
  });
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByText("Contract rate override", { exact: true }).click();
  await page.getByRole("spinbutton", { name: "USD per DBU", exact: true }).fill("0.123");
  await page.getByRole("spinbutton", { name: "USD per DBU", exact: true }).press("Enter");
  await page.getByRole("textbox", { name: "Rate source", exact: true }).fill("Procurement quote October 2026");
  await page.keyboard.press("Escape");
  const saved = await savedDownload(page);
  expect(saved.annual).toBeCloseTo(147.6, 2);
  expect(saved.portfolio.workloads[0].rateProvenance).toMatchObject({
    kind: "custom",
    label: "Procurement quote October 2026",
    currency: "USD",
  });
  await page.reload();
  const reopened = await savedDownload(page);
  expect(reopened.annual).toBe(saved.annual);
  expect(reopened.portfolio.workloads[0].rateProvenance).toEqual(saved.portfolio.workloads[0].rateProvenance);
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByText("Contract rate override", { exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "USD per DBU", exact: true })).toHaveValue("0.123");
  await expect(page.getByRole("textbox", { name: "Rate source", exact: true })).toHaveValue(
    "Procurement quote October 2026",
  );
});

test("sample usage remains labeled as demonstration data after sharing and reopening", async ({ page }) => {
  await page.goto("./");
  await page.getByText("Use my real usage", { exact: true }).click();
  await page.getByRole("button", { name: "Load a sample" }).click();
  await expect(page.getByRole("heading", { name: "Review usage import" })).toBeVisible();
  await page.getByRole("button", { name: "Use this baseline" }).click();
  const sample = await savedDownload(page);
  expect(sample.portfolio.usage?.sourceLabel).toBe("Bundled demonstration sample");
  await page.reload();
  expect((await savedDownload(page)).portfolio.usage?.sourceLabel).toBe("Bundled demonstration sample");
});

test("a schema-entered cost remains an explicit custom price through source refresh and reopening", async ({
  page,
}) => {
  await page.goto("./");
  const { portfolio } = await savedDownload(page);
  delete portfolio.simple;
  portfolio.cloud = "azure";
  portfolio.region = "westeurope";
  portfolio.forecast.annualGrowth = 0;
  portfolio.workloads = [
    {
      id: "rooms",
      name: "Supplied room cost",
      kind: "metered",
      productId: "clean_rooms",
      sku: "managed_services",
      dbuPerMonth: 0,
      fixedUsdByCloud: { azure: 50 },
      priceStatus: "unpriced",
    },
  ];
  await page.getByLabel("Open a saved forecast").setInputFiles({
    name: "room.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "cayfore.forecast", version: 1, portfolio })),
  });
  await page.getByRole("button", { name: "Advanced", exact: true }).last().click();
  await page.getByRole("spinbutton", { name: "Azure dollars / month", exact: true }).fill("73");
  await page.keyboard.press("Escape");
  const saved = await savedDownload(page);
  expect(saved.annual).toBe(876);
  expect(saved.portfolio.workloads[0].rateProvenance?.kind).toBe("custom");
  expect(saved.portfolio.workloads[0].priceStatus).not.toBe("unpriced");
  await page.reload();
  const reopened = await savedDownload(page);
  expect(reopened.annual).toBe(876);
  expect(reopened.portfolio.workloads[0].fixedUsdByCloud?.azure).toBe(73);
  expect(reopened.portfolio.workloads[0].rateProvenance?.kind).toBe("custom");
});
