import { referenceRegion, skuCatalog } from "../catalog.js";
import type { Workload } from "../types.js";
import { CLOUDS, monetary, placements, pricingSource, secondarySource, source, type RowContext } from "./context.js";

export function storageRows(context: RowContext, workload: Workload): boolean {
  if (workload.kind === "lakebase") {
    placements((region, tier) => {
      const available = skuCatalog.lakebase.available[region.cloud];
      monetary(context, {
        componentId: "compute",
        componentName: "Lakebase compute",
        unit: "CU-hour",
        cloud: region.cloud,
        region: region.id,
        regionLabel: region.label,
        tier,
        unitPriceUsd: available ? skuCatalog.lakebase.usdPerCuHour[region.cloud] * region.factor : null,
        baseRateUsd: available ? skuCatalog.lakebase.usdPerCuHour[region.cloud] : null,
        regionFactor: available ? region.factor : null,
        sourceRegion: available ? referenceRegion[region.cloud] : null,
        status: available ? "approximate" : "unpriced",
        confidence: available ? (region.factor === 1 ? "secondary" : "proxy") : "unpublished",
        formula: "CU-hours × reference USD/CU-hour × regional planning factor",
        includesCompute: true,
        notes: [
          skuCatalog.lakebase.note,
          ...(!available ? ["No Lakebase compute price is stored for this cloud; this is not zero cost."] : []),
        ],
        sources: [
          region.cloud === "azure"
            ? source(
                "East US Database Serverless meter × 0.213",
                "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview",
                "price",
              )
            : secondarySource,
        ],
      });
    });
    if (context.partId !== "compute")
      for (const cloud of CLOUDS) {
        const available = skuCatalog.lakebase.available[cloud];
        monetary(context, {
          componentId: "storage",
          componentName: "Lakebase database storage",
          cloud,
          unit: "GB-month",
          unitPriceUsd: available ? skuCatalog.lakebase.usdPerGbMonth[cloud] : null,
          status: available ? "approximate" : "unpriced",
          confidence: available ? "secondary" : "unpublished",
          sourceRegion: referenceRegion[cloud],
          formula: "Stored GB-month × bundled database storage rate",
          sources: [secondarySource],
          notes: ["Storage is separate from compute; the stored reference rate is not an exact regional tariff."],
        });
      }
    return true;
  }
  if (workload.kind === "storage") {
    for (const cloud of CLOUDS) {
      const base = workload.managed
        ? skuCatalog.managedStoragePerDsu[cloud]
        : skuCatalog.objectStoragePerGbMonth[cloud];
      const multiplier = workload.rateMultiplier ?? 1;
      monetary(context, {
        componentId: "storage",
        componentName: workload.managed ? "Managed storage" : "Customer object storage",
        cloud,
        unit: "GB-month",
        unitPriceUsd: base * multiplier,
        baseRateUsd: base,
        sourceRegion: referenceRegion[cloud],
        confidence: workload.managed ? "assumption" : "secondary",
        formula: `GB-month × reference rate × ${multiplier} storage multiplier`,
        dimensions: { managed: workload.managed, storageMultiplier: multiplier },
        notes: [
          workload.managed
            ? "Bundled approximation: one DSU per GB-month. Storage service multipliers are consumption assumptions."
            : "Single object-storage reference rate; storage class, operations, replication and regional variations are excluded.",
          ...(cloud === "gcp" && context.product.id.startsWith("lakebase")
            ? ["A storage assumption does not establish Lakebase availability on GCP."]
            : []),
        ],
        sources: [
          cloud === "azure" && workload.managed
            ? source(
                "East US DSU meter",
                "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview",
                "price",
              )
            : secondarySource,
        ],
      });
    }
    return true;
  }
  if (workload.kind === "egress") {
    for (const cloud of CLOUDS)
      monetary(context, {
        componentId: "networking",
        componentName: "Generic internet egress assumption",
        cloud,
        unit: "GB",
        unitPriceUsd: skuCatalog.defaultEgressPerGb[cloud],
        sourceRegion: referenceRegion[cloud],
        formula: "Transfer GB × editable reference USD/GB",
        notes: [
          "Single planning assumption. Routing, transfer direction, source/destination region and endpoint charges are excluded.",
        ],
        sources: [pricingSource],
      });
    return true;
  }
  return false;
}
