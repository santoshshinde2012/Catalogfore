import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { productCatalog } from "@cayfore/catalog";
import { firstPartyDbuRate, regionalSkuRate, skuCatalog, skuRate, vmHourly } from "../catalog.js";
import { blankPortfolio } from "../portfolio.js";
import { estimate } from "../estimate.js";
import { workloadsForProduct, recomputeProduct } from "../products.js";
import { buildUnitCostCatalog, filterUnitCosts, unitCostCsv, unitCostJson } from "./index.js";
import type { UnitCostRow } from "./types.js";
import { applyEvidence } from "./evidence.js";
import { sourceReviewedOn } from "./provenance.js";

const catalog = buildUnitCostCatalog();
const row = (productId: string, filters: Partial<UnitCostRow> = {}) => {
  const found = catalog.rows.find(
    (item) =>
      item.productId === productId &&
      Object.entries(filters).every(([key, value]) => item[key as keyof UnitCostRow] === value),
  );
  if (!found) throw new Error(`Missing row ${productId}: ${JSON.stringify(filters)}`);
  return found;
};
const east = { cloud: "azure", region: "eastus", tier: "premium" } as const;

describe("canonical unit-cost inventory", () => {
  it("covers every product/part and platform concept with stable unique rows", () => {
    expect(catalog.products).toHaveLength(78);
    expect(new Set(catalog.rows.map((item) => item.id)).size).toBe(catalog.rows.length);
    const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
    expect(fingerprint(buildUnitCostCatalog())).toBe(fingerprint(catalog));
    const productIds = new Set(catalog.rows.map((item) => item.productId));
    const partIds = new Set(catalog.rows.map((item) => `${item.productId}:${item.partId}`));
    const missingDefinitions = productCatalog.products.flatMap((product) => [
      ...(!productIds.has(product.id) ? [product.id] : []),
      ...(product.parts ?? [])
        .filter((part) => !partIds.has(`${product.id}:${part.id}`))
        .map((part) => `${product.id}:${part.id}`),
    ]);
    expect(missingDefinitions).toEqual([]);
    expect(catalog.rows.filter((item) => item.status === "not_applicable")).toHaveLength(8);
    const invalidRows = catalog.rows
      .filter(
        (item) =>
          item.sources.length === 0 ||
          !item.sources.every((reference) => reference.url.startsWith("https://")) ||
          !item.sources.every((reference) => reference.authority && reference.publisher) ||
          !item.evidenceSummary ||
          !(item.unitPriceUsd === null || Number.isFinite(item.unitPriceUsd)) ||
          !Number.isFinite(item.unitQuantity) ||
          item.unitQuantity <= 0 ||
          !Object.is(item.usdPerUnit, item.unitPriceUsd === null ? null : item.unitPriceUsd / item.unitQuantity) ||
          (item.baseRateUsd !== null && !item.baseRateUnit) ||
          ((item.status === "unpriced" || item.status === "not_applicable") && item.unitPriceUsd !== null),
      )
      .map((item) => item.id);
    expect(invalidRows).toEqual([]);
  });

  it("uses exact first-party regional prices before proxies, including Azure Enterprise aliasing", () => {
    const direct = row("jobs_serverless", east);
    expect(direct.unitPriceUsd).toBe(regionalSkuRate("azure", "eastus", "premium", "jobs_serverless"));
    expect(direct.confidence).toBe("measured");
    expect(direct.sourceRegion).toBe("eastus");
    expect(row("jobs_serverless", { ...east, tier: "enterprise" }).unitPriceUsd).toBe(direct.unitPriceUsd);
    const proxyRegion = skuCatalog.regions.find((region) => region.cloud === "aws" && region.id !== "us-east-1")!;
    const published = row("jobs_serverless", { cloud: "aws", region: proxyRegion.id, tier: "premium" });
    expect(published.unitPriceUsd).toBe(
      firstPartyDbuRate("aws", proxyRegion.id, "premium", "jobs_serverless")!.usdPerDbu,
    );
    expect(published.evidenceLevel).toBe("official");
    const proxy = row("vector_search_standard", {
      cloud: "aws",
      region: proxyRegion.id,
      tier: "premium",
      componentId: "compute",
    });
    expect(proxy.unitPriceUsd).toBeCloseTo(skuRate("aws", "premium", "ai_search") * proxyRegion.factor * 4);
    expect(proxy.confidence).toBe("proxy");
    expect(proxy.sourceRegion).toBe("us-east-1");
  });

  it("does not infer a separate training infrastructure bill from a legacy inclusion flag", () => {
    const training = catalog.rows.filter((item) => item.sku === "model_training");
    expect(training.length).toBeGreaterThan(0);
    expect(training.every((item) => item.includesCompute === null)).toBe(true);
    expect(training.some((item) => item.unitPriceUsd !== null && item.unitPriceUsd > 0)).toBe(true);
  });

  it("preserves actual observation dates when source documentation is reviewed later", () => {
    const oldVm = row("jobs_classic", { cloud: "azure", componentId: "vm", variant: "on_demand" });
    const oldReference = { ...oldVm.sources[0], observedOn: "2026-01-01" };
    const reconciled = applyEvidence([{ ...oldVm, sources: [oldReference] }])[0];
    expect(reconciled.sources.find((reference) => reference.role === "price")!.observedOn).toBe("2026-01-01");
    const secondary = row("vector_search_standard", { cloud: "aws", region: "us-east-1", tier: "premium" });
    expect(secondary.sources.find((reference) => reference.role === "price")!.observedOn).toBe("2026-10-15");
    expect(sourceReviewedOn("https://azure.microsoft.com/en-us/pricing/details/databricks/")).toBe("2026-10-16");
    expect(sourceReviewedOn("https://example.com/not-in-registry")).toBeNull();
  });

  it("never treats example default usage as a conversion rate", () => {
    expect(row("ai_gateway_tables", east).dbuPerUnit).toBe(7.143);
    expect(row("ai_gateway_tracking", east).dbuPerUnit).toBe(1.429);
    expect(row("shutterstock", east).dbuPerUnit).toBe(0.857);
    const reranker = row("ai_search_reranker", east);
    expect(reranker.unitQuantity).toBe(1000);
    expect(reranker.dbuPerUnit).toBe(28.571 / 1000);
    expect(reranker.unitPriceUsd).toBeCloseTo(28.571 * 0.07);
    for (const id of ["ai_gateway_tables", "ai_gateway_tracking", "ai_search_reranker", "shutterstock"]) {
      expect(row(id, east).unitPriceUsd).not.toBe(
        productCatalog.products.find((product) => product.id === id)!.patch.dbuPerMonth,
      );
    }
  });

  it("keeps source-limited and missing prices explicit", () => {
    for (const id of ["jobs_light", "clean_rooms", "data_processed"]) {
      expect(row(id, { cloud: "azure" }).region).toBe("eastus");
      expect(row(id, { cloud: "aws" }).unitPriceUsd).toBeNull();
      expect(catalog.rows.some((item) => item.productId === id && item.region === "westeurope")).toBe(false);
    }
    expect(row("zerobus", { cloud: "aws", tier: "premium" }).unitPriceUsd).toBe(0.05);
    expect(row("zerobus", { cloud: "aws", tier: "enterprise" }).unitPriceUsd).toBe(0.064);
    expect(row("zerobus", { cloud: "gcp" }).unitPriceUsd).toBeNull();
    expect(row("lakebase", { cloud: "gcp", componentId: "compute" }).unitPriceUsd).toBeNull();
    for (const product of productCatalog.products.filter((product) => product.listPrice === "unpublished")) {
      expect(
        catalog.rows.filter((item) => item.productId === product.id).every((item) => item.unitPriceUsd === null),
      ).toBe(true);
    }
  });

  it("separates node DBUs, VM infrastructure, Photon, SQL sizing and Spot estimates", () => {
    const compute = row("jobs_classic", { ...east, instanceId: "Standard_DS3_v2", componentId: "compute" });
    expect(compute.unitPriceUsd).toBeCloseTo(0.75 * 0.3);
    expect(compute.includesCompute).toBe(false);
    expect(row("jobs_classic", { cloud: "azure", componentId: "photon" }).value).toBe(2.5);
    expect(row("all_purpose_classic", { cloud: "aws", componentId: "photon" }).value).toBe(2);
    const fallback = row("jobs_classic", {
      cloud: "gcp",
      region: "europe-west1",
      instanceId: "n2-standard-4",
      componentId: "vm",
    });
    expect(fallback.sourceRegion).toBe("us-central1");
    expect(fallback.unitPriceUsd).toBe(vmHourly("gcp", "europe-west1", "n2-standard-4").hourly);
    expect(fallback.status).toBe("approximate");
    const spot = row("jobs_classic", {
      cloud: "aws",
      region: "us-east-1",
      instanceId: "m5.xlarge",
      componentId: "vm",
      variant: "spot",
    });
    expect(spot.confidence).toBe("assumption");
    expect(spot.notes.join(" ")).toContain("not a live Spot quote");
    expect(row("sql_serverless", { ...east, variant: "s" }).dbuPerUnit).toBe(12);
    expect(row("sql_classic", { componentId: "sql_vm", variant: "s" }).unitPriceUsd).toBe(12 * 0.22);
    expect(row("sql_classic", { componentId: "sql_vm", variant: "s" }).baseRateUnit).toBe(
      "DBU infrastructure-equivalent",
    );
    expect(row("sql_classic", { componentId: "sql_vm", variant: "s" }).dimensions.warehouseDbuPerHour).toBe(12);
    expect(row("sql_serverless", { ...east, variant: "s" }).baseRateUnit).toBe("DBU");
    expect(row("databricks_apps", { ...east, variant: "large" }).dbuPerUnit).toBe(1);
  });

  it("retains token direction, capacity basis, curated storage and conflicting evidence", () => {
    const input = row("fm_llama4_maverick", { ...east, componentId: "input" });
    const output = row("fm_llama4_maverick", { ...east, componentId: "output" });
    expect(input.unitQuantity).toBe(1_000_000);
    expect(input.dbuPerUnit).toBe(7.143 / 1_000_000);
    expect(output.unitPriceUsd).toBeCloseTo(21.429 * 0.07);
    expect(
      catalog.rows
        .filter((item) => item.productId === "fm_llama4_maverick")
        .every((item) => item.modelId === "llama4-maverick"),
    ).toBe(true);
    expect(catalog.rows.some((item) => item.modelId === "gte" && item.componentId === "output")).toBe(false);
    const conflict = row("foundation_provisioned", { ...east, modelId: "gte", componentId: "provisioned" });
    expect(conflict.confidence).toBe("conflict");
    expect(conflict.unitPriceUsd).toBeNull();
    expect(conflict.dbuPerUnit).toBeNull();
    expect(conflict.notes.join(" ")).toContain("20 DBU/hour");
    expect(conflict.unit).toBe("50-model-unit-hour");
    expect(row("vector_search_standard", { componentId: "storage" }).confidence).toBe("assumption");
    expect(row("vector_search_standard", { componentId: "storage_allowance" }).value).toBe(30);
    const evaluation = row("agent_evaluation", { ...east, componentId: "input" });
    expect(evaluation.confidence).toBe("assumption");
    expect(evaluation.componentName).toContain("Planning proxy");
    expect(evaluation.notes.join(" ")).toContain("5 DBU/question");
    expect(row("serverless_gpu", east).confidence).toBe("assumption");
  });

  it("represents dated promotions and user allowances without discounting list rates", () => {
    expect(row("assistant_agent", { ...east, componentId: "dbu" }).unitPriceUsd).toBe(0.07);
    const promo = row("assistant_agent", { componentId: "promotion" });
    expect(promo.value).toBe(0.75);
    expect(promo.unitPriceUsd).toBeNull();
    expect(promo.effectiveTo).toBe("2027-02-01T00:00:00Z");
    expect(row("genie", { componentId: "promotion" }).value).toBe(0);
    expect(row("assistant_agent", { componentId: "user_allowance" }).value).toBe(150);
    expect(row("genie", { componentId: "usage_assumption" }).unitPriceUsd).toBeNull();
    expect(row("compliance_addon", { variant: "mission_critical" }).value).toBe(0.3);
    expect(row("data_quality", { componentId: "consumption_multiplier" }).value).toBe(2);
    expect(row("data_classification", { componentId: "consumption_multiplier" }).value).toBe(3);
    const launch = row("serving_launch_charge", east);
    expect(launch.confidence).toBe("assumption");
    expect(
      launch.sources.some(
        (reference) =>
          reference.url ===
          productCatalog.products.find((product) => product.id === "serving_launch_charge")!.source.url,
      ),
    ).toBe(true);
  });

  it("reconciles a one-unit converted forecast with the engine and preserves partial components", () => {
    const parse = workloadsForProduct("ai_parse_document")[0];
    const next = recomputeProduct({ ...parse, inputs: { pages: 1, complexity: "caption" } });
    const result = estimate({ ...blankPortfolio("azure"), region: "eastus", workloads: [next] });
    expect(result.total).toBeCloseTo(
      Math.round(row("ai_parse_document", { ...east, variant: "caption" }).unitPriceUsd! * 100) / 100,
    );
    expect(row("lakebase_branches", { partId: "compute", ...east }).componentId).toBe("compute");
    expect(row("lakebase_branches", { partId: "storage", cloud: "azure" }).unitPriceUsd).toBeCloseTo(15 * 0.026);
    expect(
      catalog.rows.filter((item) => item.productId === "agent_bricks").some((item) => item.partId === "training"),
    ).toBe(true);
  });
});

describe("unit-cost search and portable exports", () => {
  it("matches aliases/sources, intersects exact dimensions and retains unscoped context", () => {
    expect(filterUnitCosts(catalog.rows, { query: "AI Gateway" }).length).toBeGreaterThan(0);
    expect(
      filterUnitCosts(catalog.rows, { query: "prices.azure.com", ...east }).every(
        (item) => item.cloud === null || item.cloud === "azure",
      ),
    ).toBe(true);
    expect(filterUnitCosts(catalog.rows, { productId: "private_link", ...east })).toHaveLength(1);
    expect(
      filterUnitCosts(catalog.rows, { productId: "assistant_agent", ...east, status: "conditional" }),
    ).toHaveLength(2);
    expect(filterUnitCosts(catalog.rows, { cloud: "all", query: "unlikely nonexistent phrase" })).toHaveLength(0);
    const exact = filterUnitCosts(catalog.rows, {
      productId: "jobs_serverless",
      domainId: "engineering",
      componentId: "dbu",
      ...east,
    });
    expect(exact).toHaveLength(1);
  });

  it("exports null as blank, documents real zero factors and escapes hostile spreadsheet text", () => {
    const special = { ...row("private_link"), productName: '=HYPERLINK("https://example.com")\n,quoted', value: 0 };
    const csv = unitCostCsv([special]);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")\n,quoted"');
    expect(csv).toContain(",0,");
    expect(csv).not.toContain(",null,");
    const parsed = JSON.parse(unitCostJson(catalog, [special]));
    expect(parsed.products).toHaveLength(1);
    expect(parsed.rows[0].unitPriceUsd).toBeNull();
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(unitCostCsv([])).toContain("unitPriceUsd");
    expect(JSON.parse(unitCostJson(catalog, [])).products).toEqual([]);
  });
});
