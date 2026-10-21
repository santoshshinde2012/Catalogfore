import document from "../../../../../data/generated/rate-confidence.json";
import type { Cloud, SkuId, Tier } from "../../types.js";

const scores = new Map(
  document.cells.map((cell) => [`${cell.cloud}|${cell.region}|${cell.tier}|${cell.sku}`, cell.score]),
);

/**
 * Stored evidence score for one price cell.
 * Excel imports this module directly so the forecast page does not load the cell table.
 */
export function rateConfidenceScore(cloud: Cloud, region: string, tier: Tier, sku: SkuId): number | undefined {
  return scores.get(`${cloud}|${region}|${tier}|${sku}`);
}
