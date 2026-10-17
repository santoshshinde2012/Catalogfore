import { ZEROBUS_USD_PER_GB, ZEROBUS_REFERENCE_REGIONS, ZEROBUS_PRICE_SOURCE } from "../rates/published.js";
import { CLOUDS, TIERS, monetary, source, type RowContext } from "./context.js";

/** GB prices are separate from DBUs and retain their exact reference-region evidence. */
export function zerobusRows(context: RowContext) {
  for (const cloud of CLOUDS)
    for (const tier of TIERS) {
      const rate = ZEROBUS_USD_PER_GB[cloud]?.[tier] ?? null;
      monetary(context, {
        componentId: "ingestion",
        componentName: "Zerobus ingestion",
        cloud,
        tier,
        region: ZEROBUS_REFERENCE_REGIONS[cloud] ?? null,
        regionLabel: cloud === "aws" ? "US East" : cloud === "azure" ? "East US" : null,
        sourceRegion: ZEROBUS_REFERENCE_REGIONS[cloud] ?? null,
        unit: "GB",
        unitPriceUsd: rate,
        status: rate === null ? "unpriced" : "priced",
        confidence: rate === null ? "unpublished" : "measured",
        formula: "Ingested GB × reference USD/GB; no region factor",
        includesCompute: true,
        sources: [
          source(
            ZEROBUS_PRICE_SOURCE.title,
            ZEROBUS_PRICE_SOURCE.url,
            "price",
            cloud === "aws"
              ? `JSON pointer /${tier}/AWS/zerobus/US East (N. Virginia); USD/GB`
              : cloud === "azure"
                ? "JSON pointer /premium/Azure/zerobus/US East; USD/GB; Enterprise aliases Premium"
                : undefined,
            ZEROBUS_PRICE_SOURCE.observedOn,
          ),
        ],
        notes: ["Reference-region snapshot; no price is inferred for another region or unsupported cloud."],
      });
    }
  return;
}
