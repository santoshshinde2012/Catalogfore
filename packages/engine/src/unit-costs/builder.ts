import { productCatalog } from "@cayfore/catalog";
import { skuCatalog } from "../catalog.js";
import { workloadsForProduct } from "../products.js";
import { aiRows } from "./ai.js";
import { clusterRows } from "./compute.js";
import { simpleComputeRows } from "./simple-compute.js";
import { append, inventory, source, type RowContext } from "./context.js";
import { applyEvidence, unitCostReviewedOn, unitCostScope } from "./evidence.js";
import { meteredRows } from "./metered.js";
import { storageRows } from "./storage.js";
import type { UnitCostCatalog, UnitCostRow } from "./types.js";

/** Pure projection of the installed price book: no network, current clock, or workload usage defaults. */
export function buildUnitCostCatalog(): UnitCostCatalog {
  const rows: UnitCostRow[] = [];
  for (const product of productCatalog.products) {
    const context: RowContext = { product, partId: null, rows };
    if (product.listPrice === "unpublished") {
      append(context, {
        componentId: "unpriced",
        componentName: "Unresolved product pricing",
        unit: product.billingUnit,
        formula: "No independent trustworthy unit quote is stored for this product",
        notes: [
          "Missing bundled pricing is not a free service. Review underlying billable products and current account pricing.",
        ],
        sources: [source(product.source.title, product.source.url, "context")],
      });
      if (product.id === "compliance_addon")
        for (const [variant, value] of Object.entries(skuCatalog.addonRates)) {
          if (variant === "none") continue;
          append(context, {
            componentId: "spend_factor",
            componentName: "Forecast add-on assumption",
            variant,
            unit: "share-of-eligible-spend",
            rateKind: "multiplier",
            value,
            confidence: "assumption",
            status: "approximate",
            formula: `Eligible workspace spend × ${value}`,
            notes: ["Planning percentage; not an official per-DBU meter."],
            sources: [source(product.source.title, product.source.url, "context")],
          });
        }
      continue;
    }
    for (const workload of workloadsForProduct(product.id)) {
      const part = { ...context, partId: workload.partId ?? null };
      if (workload.kind === "cluster") clusterRows(part, workload);
      else if (simpleComputeRows(part, workload) || aiRows(part, workload) || storageRows(part, workload)) continue;
      else if (workload.kind === "metered") meteredRows(part, workload);
    }
  }
  for (const product of inventory.filter((entry) => entry.kind === "platform-service"))
    rows.push({
      id: `${product.id}:context`,
      productId: product.id,
      productName: product.name,
      partId: null,
      componentId: "foundation",
      componentName: "Shared platform foundation",
      domainId: product.domainId,
      domainName: product.domainName,
      category: null,
      cloud: null,
      region: null,
      regionLabel: null,
      tier: null,
      sku: null,
      variant: null,
      modelId: null,
      instanceId: null,
      unit: "context",
      unitQuantity: 1,
      unitPriceUsd: null,
      usdPerUnit: null,
      dbuPerUnit: null,
      baseRateUsd: null,
      baseRateUnit: null,
      regionFactor: null,
      sourceRegion: null,
      status: "not_applicable",
      confidence: "unpublished",
      evidenceLevel: "not_applicable",
      evidenceSummary: "Platform context has no independent unit quote.",
      rateKind: "unpriced",
      value: null,
      formula: "No independent unit tariff: inspect connected compute, storage and product charges",
      notes: ["Learning-only platform concept. Absence of an independent fee does not make connected services free."],
      conditions: [],
      effectiveFrom: null,
      effectiveTo: null,
      includesCompute: null,
      dimensions: { aliases: product.aliases.join("; ") },
      sources: product.sources,
    });
  const enriched = rows.map((row) => ({
    ...row,
    dimensions: {
      ...row.dimensions,
      aliases: inventory.find((product) => product.id === row.productId)!.aliases.join("; "),
    },
  }));
  return {
    schemaVersion: "1.0.0",
    catalogVersion: productCatalog.version,
    verifiedOn: productCatalog.verifiedOn,
    reviewedOn: unitCostReviewedOn,
    disclaimer: unitCostScope,
    products: inventory,
    rows: applyEvidence(enriched),
  };
}
