import type {
  Estimate,
  LineItem,
  Portfolio,
  PriceCoverage,
  PriceStatus,
  RateProvenance,
  SkuId,
  Workload,
} from "../types.js";
import type { EstimateDependencies } from "./estimate-portfolio.js";
import { resolvePlacement } from "./support.js";
import type { RawLine } from "./types.js";

/** Missing charges remain visible even when other lines have a known subtotal. */
export function lineProvenance(
  raw: RawLine,
  workload: Workload,
  portfolio: Portfolio,
  dependencies: EstimateDependencies,
): { priceStatus: PriceStatus; rateProvenance: RateProvenance; notes: string[] } {
  const placement = resolvePlacement(dependencies.catalog, portfolio, workload);
  const embedded =
    workload.kind === "metered" && (workload.rateByCloud || workload.fixedUsdByCloud || workload.rateByPlacement);
  const conflict =
    !embedded &&
    dependencies.catalog.firstPartyDbuConflict?.(placement.cloud, placement.region, placement.tier, raw.sku as SkuId);
  const missing =
    Boolean(conflict) ||
    raw.notes.some((note) =>
      /no list rate|not priced|unknown (?:instance|foundation|GPU)|missing (?:VM |price|rate)|unpriced/i.test(note),
    );
  const exactRate = dependencies.catalog.firstPartyDbuRate?.(
    placement.cloud,
    placement.region,
    placement.tier,
    raw.sku as SkuId,
  );
  const baseRate = dependencies.catalog.firstPartyBaseDbuRate?.(placement.cloud, placement.tier, raw.sku as SkuId);
  const approximate = raw.approximateVm || (!embedded && !exactRate && placement.regionSource.startsWith("proxy"));
  const provenance =
    workload.rateProvenance ??
    ({
      kind: embedded && !workload.productId ? "custom" : "catalog",
      label: embedded && !workload.productId ? "Unlabelled supplied rate" : "Bundled public price book",
      currency: "USD",
      catalogVersion: dependencies.catalog.version,
      ...((exactRate ?? baseRate)?.observedOn ? { verifiedOn: (exactRate ?? baseRate)!.observedOn! } : {}),
    } satisfies RateProvenance);
  const source =
    (exactRate ?? baseRate)?.sourceUrl ??
    (placement.cloud === "azure"
      ? "https://azure.microsoft.com/en-us/pricing/details/databricks/"
      : "https://www.databricks.com/product/pricing");
  const rateProvenance: RateProvenance = conflict
    ? {
        kind: "catalog",
        label: "Unresolved first-party price conflict",
        currency: "USD",
        catalogVersion: dependencies.catalog.version,
        source: conflict.sources[0]?.url,
      }
    : provenance.kind === "catalog" && !provenance.source
      ? { ...provenance, source }
      : provenance;
  const declaredStatus =
    workload.priceStatus === "free" && (raw.dbuCost !== 0 || raw.cloudCost !== 0) ? "priced" : workload.priceStatus;
  const priceStatus = missing ? "unpriced" : (declaredStatus ?? (approximate ? "approximate" : "priced"));
  const notes = conflict
    ? [
        ...raw.notes,
        "First-party price sources disagree for this SKU and placement. Databricks cost is withheld; totals show any other known components.",
      ]
    : raw.notes;
  return { priceStatus, rateProvenance, notes };
}

export function priceCoverage(lines: LineItem[]): PriceCoverage {
  const count = (status: PriceStatus) => lines.filter((line) => line.priceStatus === status).length;
  const unpricedLines = count("unpriced");
  return {
    pricedLines: count("priced"),
    approximateLines: count("approximate"),
    unpricedLines,
    freeLines: count("free"),
    complete: unpricedLines === 0,
  };
}

export function coverageWarnings(coverage: PriceCoverage): Estimate["warnings"] {
  return coverage.unpricedLines > 0
    ? [
        `${coverage.unpricedLines} workload${coverage.unpricedLines === 1 ? " has" : "s have"} unresolved pricing. Totals show the known subtotal, not a complete bill.`,
      ]
    : [];
}
