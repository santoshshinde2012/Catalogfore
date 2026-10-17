import { describe, expect, it } from "vitest";
import { productCatalog } from "@cayfore/catalog";
import { estimate } from "../estimate.js";
import { blankPortfolio } from "../portfolio.js";
import { recomputeProduct, workloadsForProduct } from "../products.js";
import { buildUnitCostCatalog } from "../unit-costs/builder.js";
import type { Workload } from "../types.js";
import { AZURE_REFERENCE_COMPONENTS, PARSE_DBU_PER_PAGE } from "./components.js";
import { ZEROBUS_PRICE_SOURCE, ZEROBUS_REFERENCE_REGIONS } from "./published.js";
import { projectPortfolio } from "../projection.js";

const catalog = buildUnitCostCatalog();
const publicQuote = (workload: Workload, region = "eastus") =>
  estimate({ ...blankPortfolio("azure"), region, workloads: [workload] });

describe("shared component prices and scope", () => {
  it.each(Object.keys(AZURE_REFERENCE_COMPONENTS))(
    "%s uses the same public unit price in a forecast and inventory",
    (id) => {
      const initial = workloadsForProduct(id)[0];
      if (initial.kind !== "metered") throw new Error("Expected metered product");
      const workload = recomputeProduct({ ...initial, dbuPerMonth: 1, units: 1, inputs: { gb: 1 } });
      const source = catalog.rows.find(
        (row) => row.productId === id && row.region === "eastus" && row.tier === "premium",
      )!;
      const quote = publicQuote(workload);
      expect(quote.total).toBe(source.unitPriceUsd);
      expect(quote.coverage!.complete).toBe(true);
      expect(quote.lines[0].rateProvenance!.source).toBe(source.sources[0].url);
      const unsupported = publicQuote(workload, "westeurope");
      expect(unsupported.total).toBe(0);
      expect(unsupported.lines[0].priceStatus).toBe("unpriced");
      expect(unsupported.lines[0].notes.join(" ")).toContain("observed only");
      expect(
        catalog.rows.some((row) => row.productId === id && row.region === "westeurope" && row.unitPriceUsd !== null),
      ).toBe(false);
    },
  );

  it("reprices saved public native references from the installed registry while preserving customer prices", () => {
    const initial = workloadsForProduct("jobs_light")[0];
    if (initial.kind !== "metered") throw new Error("Expected metered product");
    const saved = { ...initial, dbuPerMonth: 10, rateByCloud: { azure: 999 } };
    expect(publicQuote(saved).total).toBe(10 * AZURE_REFERENCE_COMPONENTS.jobs_light.usdPerUnit);
    const independent = {
      ...saved,
      rateByCloud: { azure: 0.1 },
      rateProvenance: { kind: "custom", label: "Contract", currency: "USD" } as const,
    };
    expect(publicQuote(independent, "westeurope").total).toBe(1);
    const imported = {
      ...saved,
      fixedUsdByCloud: { azure: 12.34 },
      rateByCloud: undefined,
      rateProvenance: { kind: "imported", label: "Invoice", currency: "USD", basis: "billed" } as const,
    };
    expect(publicQuote(imported, "westeurope").total).toBe(12.34);
  });

  it("uses one consumption band table for document calculations and inventory variants", () => {
    const initial = workloadsForProduct("ai_parse_document")[0];
    for (const [complexity, dbu] of Object.entries(PARSE_DBU_PER_PAGE)) {
      const workload = recomputeProduct({ ...initial, inputs: { pages: 1, complexity } });
      const source = catalog.rows.find(
        (row) =>
          row.productId === "ai_parse_document" &&
          row.region === "eastus" &&
          row.tier === "premium" &&
          row.variant === complexity,
      )!;
      expect(source.dbuPerUnit).toBe(dbu);
      expect(workload.kind === "metered" && workload.dbuPerMonth).toBe(source.dbuPerUnit);
      expect(publicQuote(workload).total).toBe(Math.round(source.unitPriceUsd! * 100) / 100);
    }
  });

  it.each(["aws", "azure"] as const)("keeps the public Zerobus %s price within its observed region", (cloud) => {
    const initial = workloadsForProduct("zerobus")[0];
    if (initial.kind !== "metered") throw new Error("Expected metered product");
    const referenceRegion = ZEROBUS_REFERENCE_REGIONS[cloud]!;
    const source = catalog.rows.find(
      (row) => row.productId === "zerobus" && row.cloud === cloud && row.tier === "premium",
    )!;
    const saved = {
      ...initial,
      inputs: { gb: 10 },
      units: 10,
      rateByPlacement: { [cloud]: { premium: 999 } },
      rateProvenance: {
        kind: "catalog",
        label: "Old saved reference",
        currency: "USD",
        source: "https://example.com/old-reference",
        verifiedOn: "2020-01-01",
      } as const,
    };
    const portfolio = {
      ...blankPortfolio(cloud),
      region: referenceRegion,
      workloads: [saved],
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" } as const,
    };
    const direct = estimate(portfolio);
    const projected = projectPortfolio(portfolio);
    expect(direct.total).toBe(10 * source.unitPriceUsd!);
    expect(projected.estimate.total).toBe(direct.total);
    expect(projected.points.every((point) => point.total === direct.total)).toBe(true);
    expect(direct.lines[0].rateProvenance).toMatchObject({
      source: source.sources[0].url,
      verifiedOn: ZEROBUS_PRICE_SOURCE.observedOn,
    });
    const outside = { ...portfolio, region: cloud === "aws" ? "eu-west-1" : "westeurope" };
    for (const result of [estimate(outside), projectPortfolio(outside).estimate]) {
      expect(result.total).toBe(0);
      expect(result.lines[0].priceStatus).toBe("unpriced");
      expect(result.coverage!.complete).toBe(false);
      expect(result.lines[0].notes.join(" ")).toContain("no rate is inferred");
      expect(result.lines[0].rateProvenance!.source).toBe(source.sources[0].url);
    }
  });

  it("preserves custom Zerobus GB prices and imported amounts through the complete monthly projection", () => {
    const initial = workloadsForProduct("zerobus")[0];
    if (initial.kind !== "metered") throw new Error("Expected metered product");
    const custom = {
      ...initial,
      inputs: { gb: 20 },
      units: 5,
      rateByPlacement: { aws: { premium: 0.1 } },
      rateProvenance: { kind: "custom", label: "Contract GB rate", currency: "USD", source: "contract-17" } as const,
    };
    const portfolio = {
      ...blankPortfolio("aws"),
      region: "eu-west-1",
      workloads: [custom],
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" } as const,
    };
    const result = projectPortfolio(portfolio);
    expect(result.estimate.total).toBe(2);
    expect(result.points.every((point) => point.total === 2)).toBe(true);
    expect(result.estimate.lines[0].rateProvenance).toEqual(custom.rateProvenance);
    expect(result.estimate.coverage!.complete).toBe(true);
    const imported = {
      ...custom,
      fixedUsdByCloud: { aws: 12.34 },
      rateByPlacement: undefined,
      rateProvenance: {
        kind: "imported",
        label: "Invoice",
        currency: "USD",
        source: "invoice-17",
        basis: "billed",
      } as const,
    };
    const observed = projectPortfolio({ ...portfolio, workloads: [imported] });
    expect(observed.points.every((point) => point.total === 12.34)).toBe(true);
    expect(observed.estimate.lines[0].rateProvenance).toEqual(imported.rateProvenance);
  });

  it("keeps custom Data Processed amounts and refreshes GB quantities without restoring a public price", () => {
    const initial = workloadsForProduct("data_processed")[0];
    if (initial.kind !== "metered") throw new Error("Expected metered product");
    const custom = {
      ...initial,
      inputs: { gb: 20 },
      units: 5,
      fixedUsdByCloud: { azure: 12.34 },
      rateProvenance: { kind: "custom", label: "Monthly contract", currency: "USD" } as const,
    };
    const computed = recomputeProduct(custom);
    expect(computed.kind === "metered" && computed.units).toBe(20);
    const result = projectPortfolio({
      ...blankPortfolio("azure"),
      region: "westeurope",
      workloads: [custom],
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
    });
    expect(result.points.every((point) => point.total === 12.34)).toBe(true);
    expect(result.estimate.lines[0].rateProvenance).toEqual(custom.rateProvenance);
  });

  it("uses canonical native price provenance when reopening old public workloads", () => {
    const initial = workloadsForProduct("jobs_light")[0];
    if (initial.kind !== "metered") throw new Error("Expected metered product");
    const stale = {
      ...initial,
      dbuPerMonth: 10,
      rateByCloud: undefined,
      rateProvenance: {
        kind: "catalog",
        label: "Old reference",
        currency: "USD",
        source: "https://example.com/old-reference",
        verifiedOn: "2020-01-01",
      } as const,
    };
    const result = publicQuote(stale);
    const source = catalog.rows.find(
      (row) => row.productId === "jobs_light" && row.region === "eastus" && row.tier === "premium",
    )!;
    expect(result.total).toBe(2.2);
    expect(result.lines[0].rateProvenance).toMatchObject({
      source: source.sources[0].url,
      verifiedOn: source.sources[0].observedOn,
    });
  });
});

describe("shared component gaps", () => {
  it("withholds conflicting GTE capacity in both consumers while preserving independently priced tokens", () => {
    const initial = workloadsForProduct("foundation_provisioned")[0];
    if (initial.kind !== "foundation_model") throw new Error("Expected foundation model");
    const workload = {
      ...initial,
      modelId: "gte",
      inputTokensPerMonth: 1_000_000,
      outputTokensPerMonth: 0,
      provisionedHoursPerMonth: 100,
    };
    const quote = publicQuote(workload);
    const source = catalog.rows.find(
      (row) => row.productId === "foundation_provisioned" && row.modelId === "gte" && row.componentId === "provisioned",
    )!;
    expect(source.unitPriceUsd).toBeNull();
    expect(source.confidence).toBe("conflict");
    expect(quote.lines[0].notes.join(" ")).toContain("Unpriced provisioned capacity");
    expect(quote.coverage!.complete).toBe(false);
    expect(quote.lines[0].dbu).toBe(1.857);
    expect(quote.total).toBe(0.13);
    expect(publicQuote({ ...workload, provisionedHoursPerMonth: 0 }).coverage!.complete).toBe(true);
  });

  it("keeps every unpublished product unresolved until a supported supplied conversion exists", () => {
    for (const product of productCatalog.products.filter((entry) => entry.listPrice === "unpublished")) {
      const quote = estimate({ ...blankPortfolio(), workloads: workloadsForProduct(product.id) });
      expect(quote.coverage!.complete, product.id).toBe(false);
      expect(
        quote.lines.every((line) => line.priceStatus === "unpriced"),
        product.id,
      ).toBe(true);
    }
    const initial = workloadsForProduct("fm_other")[0];
    const supplied = recomputeProduct({
      ...initial,
      inputs: { inputTokens: 1_000_000, outputTokens: 0, inputDbuPerMillion: 2 },
    });
    expect(publicQuote(supplied).lines[0].priceStatus).toBe("priced");
    expect(publicQuote(supplied).total).toBe(0.14);
  });
});
