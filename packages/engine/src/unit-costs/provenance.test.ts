import { describe, expect, it } from "vitest";
import { buildUnitCostCatalog } from "./builder.js";
import { filterUnitCosts } from "./serialization.js";
import { PRODUCT_NAME } from "../product-name.js";
import { sourceIdentity, sourceReference, withEvidenceLevel } from "./provenance.js";
import type { UnitCostRow } from "./types.js";

const catalog = buildUnitCostCatalog();
const direct = catalog.rows.find(
  (row) =>
    row.productId === "jobs_serverless" && row.cloud === "azure" && row.region === "eastus" && row.tier === "premium",
)!;
const classify = (changes: Partial<UnitCostRow>) => withEvidenceLevel({ ...direct, ...changes });

describe("source authority and numeric evidence", () => {
  it("recognizes exact publishers without trusting lookalikes, credentials or community contributions", () => {
    expect(sourceIdentity("https://prices.azure.com/api/retail/prices")).toEqual({
      authority: "first_party",
      publisher: "Microsoft",
    });
    expect(sourceIdentity("https://www.databricks.com/en-pricing-assets/data/pricing/AWS.json").authority).toBe(
      "first_party",
    );
    expect(sourceIdentity("https://community.databricks.com/t5/example").authority).toBe("secondary");
    expect(sourceIdentity("https://github.com/santoshshinde2012/Catalogfore/blob/main/data/instances.json")).toEqual({
      authority: "project",
      publisher: PRODUCT_NAME,
    });
    for (const url of [
      "https://prices.azure.com.example.org/rates",
      "https://www.databricks.com.evil.example/pricing",
      "https://evil.example/prices.azure.com",
      "https://user@prices.azure.com/api/retail/prices",
      "http://prices.azure.com/api/retail/prices",
      "https://prices.azure.com:444/api/retail/prices",
      "https://github.com/santoshshinde2012/Catalogfore-unrelated/blob/main/data.json",
      "https://github.com/santoshshinde2012/cayfore-unrelated/blob/main/data.json",
      "not a URL",
    ])
      expect(sourceIdentity(url).authority).toBe("unknown");
  });

  it("does not refresh an observation when a source is reviewed or a file is regenerated", () => {
    const guide = sourceReference(
      "Consumption",
      "https://learn.microsoft.com/en-us/azure/databricks/resources/pricing",
      "consumption",
    );
    expect(guide.observedOn).toBeNull();
    expect(guide.reviewedOn).toBe(catalog.reviewedOn);
    const unknown = sourceReference("Unreviewed", "https://example.org/rate", "price");
    expect(unknown.observedOn).toBeNull();
    expect(unknown.reviewedOn).toBeNull();
    const legacy = classify({ sources: direct.sources.map((reference) => ({ ...reference, observedOn: null })) });
    expect(legacy.evidenceLevel).toBe("estimate");
    expect(legacy.evidenceSummary).toContain("missing");
  });

  it("requires observed monetary evidence instead of upgrading official context or manual source labels", () => {
    expect(direct.evidenceLevel).toBe("official");
    const contextOnly = direct.sources.map((reference) => ({ ...reference, role: "context" as const }));
    expect(classify({ sources: contextOnly }).evidenceLevel).toBe("estimate");
    expect(classify({ confidence: "assumption" }).evidenceLevel).toBe("estimate");
    expect(classify({ confidence: "proxy" }).evidenceLevel).toBe("estimate");
    const forged = { ...direct.sources[0], url: "https://prices.azure.com.evil.example/rates" };
    expect(classify({ sources: [forged] }).evidenceLevel).toBe("estimate");
    expect(classify({ unitPriceUsd: Number.NaN }).evidenceLevel).toBe("estimate");
  });

  it("keeps a derived component distinct and respects the cloud scope of consumption documentation", () => {
    const consumption = sourceReference(
      "Azure consumption",
      "https://learn.microsoft.com/en-us/azure/databricks/resources/pricing",
      "consumption",
    );
    const converted = {
      confidence: "cited" as const,
      sources: [...direct.sources, consumption],
      unit: "app-hour",
      dbuPerUnit: 0.5,
    };
    expect(classify(converted).evidenceLevel).toBe("derived");
    expect(classify({ ...converted, cloud: "aws" }).evidenceLevel).toBe("estimate");
    const foundation = sourceReference(
      "Foundation consumption",
      "https://www.databricks.com/product/pricing/foundation-model-serving",
      "consumption",
    );
    expect(classify({ ...converted, cloud: "aws", sources: [...direct.sources, foundation] }).evidenceLevel).toBe(
      "derived",
    );
  });

  it("keeps missing and conflicted rates out of the official filter and exports explicit evidence", () => {
    expect(classify({ confidence: "conflict", status: "unpriced", unitPriceUsd: null }).evidenceLevel).toBe(
      "unresolved",
    );
    expect(classify({ status: "not_applicable", unitPriceUsd: null }).evidenceLevel).toBe("not_applicable");
    const official = filterUnitCosts(catalog.rows, { evidenceLevel: "official" });
    expect(official.length).toBeGreaterThan(0);
    expect(official.every((row) => row.confidence === "measured" && row.unitPriceUsd !== null)).toBe(true);
    expect(official.some((row) => row.confidence === "conflict" || row.confidence === "assumption")).toBe(false);
    expect(
      catalog.rows.filter((row) => row.confidence === "conflict").every((row) => row.evidenceLevel === "unresolved"),
    ).toBe(true);
  });
});
