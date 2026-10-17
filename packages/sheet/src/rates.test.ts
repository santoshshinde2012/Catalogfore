import { blankPortfolio, createWorkload, projectPortfolio, skuCatalog, type Workload } from "@cayfore/engine";
import { workloadsForProduct } from "@cayfore/engine/products";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { listedRate, listedRateDetails } from "./listed-rate";
import { buildForecastWorkbook } from "./workbook";

function project(workloads: Workload[]) {
  return projectPortfolio({
    ...blankPortfolio("aws"),
    region: "us-east-1",
    commitment: { dbuDiscount: 0.25, cloudDiscount: 0 },
    workloads,
  });
}

function metered(overrides: Partial<Extract<Workload, { kind: "metered" }>>): Workload {
  return {
    id: "metered",
    name: "Metered usage",
    kind: "metered",
    sku: "jobs_serverless",
    dbuPerMonth: 100,
    ...overrides,
  };
}

describe("workbook rate provenance", () => {
  it("uses each workload's placement, exact Azure meter, tier, and undiscounted rate", () => {
    const result = project([
      { ...createWorkload("serverless_jobs"), id: "azure", cloud: "azure", region: "westeurope", tier: "premium" },
      { ...createWorkload("serverless_jobs"), id: "aws", cloud: "aws", region: "eu-west-1", tier: "enterprise" },
    ]);
    const [azure, aws] = result.estimate.lines.map((line) => listedRateDetails(result, line));
    expect(azure).toMatchObject({
      price: 0.5,
      cloud: "azure",
      region: "westeurope",
      tier: "premium",
      confidence: 92,
      band: "measured",
    });
    expect(new URL(azure.source).hostname).toBe("prices.azure.com");
    expect(azure.basis).toMatch(/Exact Azure/);
    expect(result.estimate.lines[0].dbuCost / result.estimate.lines[0].dbu).toBeCloseTo(0.5 * 0.75, 4);
    expect(aws.price).toBeCloseTo(0.45 * 1.109091, 8);
    expect(aws).toMatchObject({ cloud: "aws", region: "eu-west-1", tier: "enterprise", confidence: 35, band: "proxy" });
    expect(new URL(aws.source).hostname).toBe("www.flexera.com");
    expect(aws.basis).toMatch(/region factor/);
  });

  it("does not replace supplied, observed, non-DBU, or unpriced amounts with a public rate", () => {
    const result = project([
      metered({
        id: "custom",
        rateByCloud: { aws: 0.123 },
        rateProvenance: { kind: "custom", label: "Contract quote", currency: "USD", source: "contract-42" },
      }),
      metered({
        id: "observed",
        dbuPerMonth: 0,
        fixedUsdByCloud: { aws: 73 },
        inputs: { usageUnit: "GB_MONTH", usageQuantity: 100 },
        rateProvenance: {
          kind: "imported",
          label: "Observed billed amount",
          currency: "USD",
          basis: "billed",
          source: "invoice-17",
        },
      }),
      metered({
        id: "unpriced",
        productId: "jobs_serverless",
        priceStatus: "unpriced",
        rateProvenance: { kind: "imported", label: "Unmapped quantity", currency: "USD", source: "usage.csv" },
      }),
      ...workloadsForProduct("clean_rooms").map((workload) => ({
        ...workload,
        id: "collaborator",
        cloud: "azure" as const,
        region: "eastus",
      })),
    ]);
    const rates = result.estimate.lines.map((line) => listedRateDetails(result, line));
    expect(rates.every((rate) => rate.price === "" && rate.confidence === "")).toBe(true);
    expect(rates[0]).toMatchObject({ band: "custom", source: "contract-42" });
    expect(rates[0].basis).toMatch(/not a bundled public/);
    expect(rates[1]).toMatchObject({ band: "imported", source: "invoice-17" });
    expect(rates[1].basis).toMatch(/billed/);
    expect(rates[2]).toMatchObject({ band: "unpublished", source: "usage.csv" });
    expect(rates[3].basis).toMatch(/Fixed USD.*not a USD\/DBU/);
    expect(result.estimate.lines[1].total).toBe(73);
  });

  it("shows the embedded Jobs Light rate and distinguishes reference-only scope", () => {
    const job = workloadsForProduct("jobs_light")[0];
    const result = project([
      { ...job, id: "east", cloud: "azure", region: "eastus" },
      { ...job, id: "west", cloud: "azure", region: "westeurope" },
    ]);
    expect(listedRate(result, result.estimate.lines[0])).toBe(0.22);
    expect(listedRateDetails(result, result.estimate.lines[0])).toMatchObject({ confidence: 92, band: "measured" });
    expect(listedRateDetails(result, result.estimate.lines[1])).toMatchObject({
      price: 0.22,
      confidence: "",
      band: "reference-rate",
    });
  });

  it("keeps a catalog-priced imported DBU estimate distinct from an observed invoice", () => {
    const result = project([
      metered({
        cloud: "azure",
        region: "eastus",
        priceStatus: "approximate",
        rateProvenance: {
          kind: "imported",
          label: "Bundled catalog estimate; export has no price",
          currency: "USD",
          source: "system-billing",
          catalogVersion: skuCatalog.version,
        },
      }),
    ]);
    const rate = listedRateDetails(result, result.estimate.lines[0]);
    expect(rate.price).toBe(0.45);
    expect(rate.basis).toMatch(/Catalog estimate for imported DBU usage; export supplied no price/);
    expect(new URL(rate.source).hostname).toBe("prices.azure.com");
  });

  it("retains repeated SKUs as separate traceable rows and leaves non-public rates blank in Excel", async () => {
    const result = project([
      { ...createWorkload("serverless_jobs"), id: "azure", name: "Europe jobs", cloud: "azure", region: "westeurope" },
      { ...createWorkload("serverless_jobs"), id: "aws", name: "US jobs", tier: "enterprise" },
      metered({
        id: "actual",
        name: "Imported bill",
        fixedUsdByCloud: { aws: 17 },
        rateProvenance: {
          kind: "imported",
          currency: "USD",
          label: "Actual cost",
          source: "source-file.csv",
          basis: "billed",
        },
      }),
    ]);
    const bytes = await buildForecastWorkbook(result);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as never);
    const rates = workbook.getWorksheet("Rates")!;
    expect(rates.rowCount).toBe(4);
    expect(Array.from({ length: 6 }, (_, index) => rates.getRow(1).getCell(index + 1).value)).toEqual([
      "SKU",
      "$/DBU",
      "Source",
      "Confidence",
      "Band",
      "Citation",
    ]);
    expect(rates.getCell("A2").value).toBe(rates.getCell("A3").value);
    expect(rates.getCell("B2").value).toBe(0.5);
    expect(rates.getCell("B3").value).toBe(0.45);
    expect(rates.getCell("E2").value).toBe("measured");
    expect(rates.getCell("E3").value).toBe("secondary");
    expect(rates.getCell("G2").value).toBe("Europe jobs");
    expect(rates.getCell("H2").value).toBe("azure");
    expect(rates.getCell("I2").value).toBe("westeurope");
    expect(rates.getCell("J3").value).toBe("enterprise");
    expect(rates.getCell("L3").value).toBe("aws");
    expect(rates.getCell("B4").value).toBe("");
    expect(rates.getCell("D4").value).toBe("");
    expect(rates.getCell("C4").value).toBe("source-file.csv");
    expect(rates.getCell("K4").value).toMatch(/Imported billed/);
    const breakdown = workbook.getWorksheet("Breakdown")!;
    expect(breakdown.getCell("D2").value).toBe(0.5);
    expect(breakdown.getCell("D3").value).toBe(0.45);
    expect(breakdown.getCell("D4").value).toBe("");
  });
});
