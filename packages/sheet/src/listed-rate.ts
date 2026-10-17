import { skuRate, type LineItem, type PortfolioProjection, type SkuId } from "@cayfore/engine";

export function listedRate(result: PortfolioProjection, line: LineItem): number | "" {
  try {
    return skuRate(result.portfolio.cloud, result.portfolio.tier, line.sku as SkuId);
  } catch {
    return "";
  }
}
