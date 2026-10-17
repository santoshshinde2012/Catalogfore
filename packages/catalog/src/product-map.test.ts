import { describe, expect, it } from "vitest";
import {
  domainById,
  filterMapEntries,
  filterProductMapEntries,
  mapEntryById,
  parseProductMap,
  productMap,
  type ProductMapDocument,
} from "./map.js";
import { productCatalog } from "./index.js";

const catalog = { ...productCatalog, products: productCatalog.products.slice(0, 2) };
function document(): ProductMapDocument {
  return {
    version: "2026-10-17.1",
    reviewedOn: "2026-10-17",
    disclaimer: "An independent educational map, not a quote.",
    sources: [{ id: "overview", title: "Official overview", url: "https://docs.databricks.com/" }],
    domains: ["engineering", "analytics"].map((id) => ({
      id,
      name: id === "engineering" ? "Data engineering" : "Analytics and BI",
      verb: "Build",
      summary: "A documented platform domain.",
      useCases: ["Understand the platform"],
      billingContext: "Review underlying compute and storage.",
      sourceIds: ["overview"],
    })),
    entries: [
      ...catalog.products.map((product, index) => ({
        id: product.id,
        productId: product.id,
        aliases: index ? ["Lightweight execution"] : ["Workflows", "Scheduled ETL"],
        domainId: "engineering",
        relatedDomainIds: index ? [] : ["analytics"],
        useCases: index ? ["Run compact tasks"] : ["Refresh a daily report"],
        sourceIds: ["overview"],
      })),
      {
        id: "unity_catalog",
        name: "Unity Catalog",
        aliases: ["Cátalog governance"],
        domainId: "analytics",
        relatedDomainIds: [],
        summary: "Govern access to data and AI.",
        useCases: ["Manage permissions"],
        billingContext: "A platform capability, not a separate forecast line.",
        sourceIds: ["overview"],
      },
    ],
    relationships: [
      { from: catalog.products[0].id, to: "unity_catalog", label: "Governed by", sourceIds: ["overview"] },
    ],
    journeys: [
      {
        id: "reporting",
        name: "Reporting",
        summary: "Build a governed reporting workload.",
        steps: [catalog.products[0].id, "unity_catalog"],
        sourceIds: ["overview"],
      },
    ],
  };
}

describe("researched product map", () => {
  it("maps every installed catalog product once and keeps pricing metadata in the catalog", () => {
    const products = productMap.entries.flatMap((entry) => (entry.product ? [entry.product] : []));
    expect(products.map((product) => product.id).sort()).toEqual(
      productCatalog.products.map((product) => product.id).sort(),
    );
    for (const entry of productMap.entries) {
      expect(domainById(entry.domainId)).toBeDefined();
      expect(entry.sources.length).toBeGreaterThan(0);
      expect(entry.billingContext.length).toBeGreaterThan(0);
      if (entry.product) {
        expect(entry.product).toBe(productCatalog.products.find((product) => product.id === entry.product!.id));
        expect(entry.sources.some((source) => source.url === entry.product!.source.url)).toBe(true);
      } else expect(entry.kind).toBe("platform-service");
    }
  });

  it("resolves current references and returns undefined for unknown entry/domain IDs", () => {
    for (const journey of productMap.journeys) {
      for (const step of journey.steps) expect(mapEntryById(step)).toBeDefined();
    }
    for (const relation of productMap.relationships) {
      expect(mapEntryById(relation.from)).toBeDefined();
      expect(mapEntryById(relation.to)).toBeDefined();
    }
    expect(mapEntryById("unknown_product")).toBeUndefined();
    expect(domainById("unknown_domain")).toBeUndefined();
    expect(filterMapEntries()).toEqual(productMap.entries);
  });

  it("keeps current educational labels separate from catalog identity and deduplicates source URLs", () => {
    const input = document();
    input.entries[0].name = "Current official name";
    input.sources[0].url = catalog.products[0].source.url;
    const map = parseProductMap(input, catalog);
    expect(map.entries[0].name).toBe("Current official name");
    expect(map.entries[0].product?.name).toBe(catalog.products[0].name);
    expect(map.entries[1].name).toBe(catalog.products[1].menuLabel);
    expect(map.entries[0].summary).toBe(catalog.products[0].summary);
    expect(map.entries[0].billingContext).toBe(catalog.products[0].note);
    expect(map.entries[0].sources).toHaveLength(1);
    expect(map.entries[2].product).toBeUndefined();
    expect(map.entries[2].billingContext).toContain("not a separate forecast line");
    expect(filterProductMapEntries(map, { query: catalog.products[0].name })).toContain(map.entries[0]);
  });
});

describe("product map integrity", () => {
  it.each([
    ["missing catalog coverage", (input: ProductMapDocument) => input.entries.splice(0, 1), /Missing product mapping/],
    [
      "duplicate coverage",
      (input: ProductMapDocument) => input.entries.push({ ...input.entries[0], id: "copy" }),
      /Duplicate product mapping/,
    ],
    [
      "unknown product",
      (input: ProductMapDocument) => (input.entries[0].productId = "unknown"),
      /Unknown catalog product/,
    ],
    [
      "duplicate entry",
      (input: ProductMapDocument) => (input.entries[1].id = input.entries[0].id),
      /Duplicate entries ID/,
    ],
    ["duplicate source", (input: ProductMapDocument) => input.sources.push(input.sources[0]), /Duplicate sources ID/],
    ["unknown domain", (input: ProductMapDocument) => (input.entries[0].domainId = "unknown"), /Unknown domain/],
    [
      "duplicate primary domain",
      (input: ProductMapDocument) => input.entries[0].relatedDomainIds.push("engineering"),
      /repeats its primary domain/,
    ],
    ["unknown source", (input: ProductMapDocument) => (input.domains[0].sourceIds = ["unknown"]), /Unknown source/],
    [
      "broken relationship",
      (input: ProductMapDocument) => (input.relationships[0].to = "unknown"),
      /Unknown relationship entry/,
    ],
    [
      "self relationship",
      (input: ProductMapDocument) => (input.relationships[0].to = input.relationships[0].from),
      /different entries/,
    ],
    ["broken journey", (input: ProductMapDocument) => input.journeys[0].steps.push("unknown"), /Unknown journey entry/],
    [
      "missing billing context",
      (input: ProductMapDocument) => delete input.entries[2].billingContext,
      /requires billingContext/,
    ],
    ["missing service summary", (input: ProductMapDocument) => delete input.entries[2].summary, /requires summary/],
    ["insecure reference", (input: ProductMapDocument) => (input.sources[0].url = "http://example.com"), /HTTPS/],
  ])("rejects %s", (_name, mutate, message) => {
    const input = document();
    mutate(input);
    expect(() => parseProductMap(input, catalog)).toThrow(message);
  });

  it("rejects executable or price fields rather than silently accepting a second pricing model", () => {
    const input = document();
    expect(() => parseProductMap({ ...input, monthlyPrice: 100 }, catalog)).toThrow(/Unrecognized key/);
    expect(() => parseProductMap({ ...input, entries: [{ ...input.entries[0], rate: 0.5 }] }, catalog)).toThrow(
      /Unrecognized key/,
    );
  });
});

describe("product map search and filters", () => {
  it.each([
    ["databricks_one", "Databricks One", "Genie One"],
    ["delta_sharing", "Delta Sharing", "OpenSharing"],
    ["vector_search_standard", "Vector Search", "AI Search"],
    ["assistant_agent", "Databricks Assistant", "Genie Code"],
  ])("finds %s under both documented current and legacy labels", (id, legacy, current) => {
    for (const query of [legacy, current]) {
      expect(filterMapEntries({ query }).map((entry) => entry.id)).toContain(id);
    }
  });

  it("matches aliases, use cases, IDs, domain names, and normalized case/accents", () => {
    const map = parseProductMap(document(), catalog);
    for (const query of [" WORKFLOWS ", "scheduled etl", "daily report", catalog.products[0].id]) {
      expect(filterProductMapEntries(map, { query }).map((entry) => entry.id)).toContain(catalog.products[0].id);
    }
    expect(filterProductMapEntries(map, { query: "catalog governance" }).map((entry) => entry.id)).toEqual([
      "unity_catalog",
    ]);
    expect(filterProductMapEntries(map, { query: "Analytics BI" }).map((entry) => entry.id)).toEqual([
      catalog.products[0].id,
      "unity_catalog",
    ]);
  });

  it("combines all query terms, kind and primary or related domain relevance without mutating the map", () => {
    const map = parseProductMap(document(), catalog);
    const before = JSON.stringify(map);
    expect(filterProductMapEntries(map, { domainId: "analytics" }).map((entry) => entry.id)).toEqual([
      catalog.products[0].id,
      "unity_catalog",
    ]);
    expect(
      filterProductMapEntries(map, { domainId: "analytics", kind: "catalog-product", query: "workflows report" }).map(
        (entry) => entry.id,
      ),
    ).toEqual([catalog.products[0].id]);
    expect(filterProductMapEntries(map, { kind: "platform-service" }).map((entry) => entry.id)).toEqual([
      "unity_catalog",
    ]);
    expect(filterProductMapEntries(map, { query: "workflows impossibleterm" })).toEqual([]);
    expect(filterProductMapEntries(map, { domainId: "unknown" })).toEqual([]);
    expect(filterProductMapEntries(map, { query: "  " })).toEqual(map.entries);
    expect(JSON.stringify(map)).toBe(before);
  });
});
