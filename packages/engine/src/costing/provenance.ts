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
import { resolveDbuRate } from "../catalog/resolve-dbu-rate.js";
import { azureReferenceComponent, AZURE_COMPONENT_SCOPE } from "../rates/components.js";
import { ZEROBUS_PRICE_SOURCE } from "../rates/published.js";

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
  const independent = ["custom", "imported"].includes(workload.rateProvenance?.kind ?? "");
  const publicComponent =
    workload.kind === "metered" && !independent
      ? azureReferenceComponent(workload.productId)
        ? {
            label: "Azure East US public component rate",
            source: AZURE_COMPONENT_SCOPE.sourceUrl,
            observedOn: AZURE_COMPONENT_SCOPE.observedOn,
          }
        : workload.productId === "zerobus"
          ? {
              label: "Databricks US East Zerobus component rate",
              source: ZEROBUS_PRICE_SOURCE.url,
              observedOn: ZEROBUS_PRICE_SOURCE.observedOn,
            }
          : null
      : null;
  const rate = embedded || publicComponent ? null : resolveDbuRate(dependencies.catalog, placement, raw.sku as SkuId);
  const conflict = rate?.conflict;
  const missing =
    Boolean(conflict) ||
    (raw.dbu !== 0 && rate?.status === "unpriced") ||
    raw.notes.some((note) =>
      /no list rate|not priced|unknown (?:instance|foundation|GPU)|missing (?:VM |price|rate)|unpriced/i.test(note),
    );
  const priceSource = rate?.sources.find((reference) => reference.role === "price");
  const approximate = raw.approximateVm || rate?.status === "approximate";
  const provenance =
    workload.rateProvenance ??
    ({
      kind: embedded && !workload.productId ? "custom" : "catalog",
      label: embedded && !workload.productId ? "Unlabelled supplied rate" : "Bundled public price book",
      currency: "USD",
      catalogVersion: dependencies.catalog.version,
      ...(priceSource?.observedOn ? { verifiedOn: priceSource.observedOn } : {}),
    } satisfies RateProvenance);
  const source =
    priceSource?.url ??
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
    : publicComponent
      ? {
          kind: "catalog",
          label: publicComponent.label,
          currency: "USD",
          source: publicComponent.source,
          verifiedOn: publicComponent.observedOn,
          catalogVersion: dependencies.catalog.version,
        }
      : provenance.kind === "catalog" && priceSource
        ? {
            ...provenance,
            source: priceSource.url,
            verifiedOn: priceSource.observedOn ?? undefined,
            catalogVersion: dependencies.catalog.version,
          }
        : provenance.kind === "catalog" && !provenance.source
          ? { ...provenance, source }
          : provenance;
  const declaredStatus =
    workload.priceStatus === "free" && (raw.dbuCost !== 0 || raw.cloudCost !== 0) ? "priced" : workload.priceStatus;
  const priceStatus = missing
    ? "unpriced"
    : approximate && declaredStatus !== "free"
      ? "approximate"
      : (declaredStatus ?? "priced");
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
