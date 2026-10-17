import { productCatalog } from "@cayfore/catalog";
import {
  bundledPricingCatalog,
  resolveDbuRate,
  azureReferenceComponent,
  componentMatchesPlacement,
  AZURE_COMPONENT_SCOPE,
  regionInfo,
  skuCatalog,
  type Cloud,
  type LineItem,
  type PortfolioProjection,
  type SkuId,
  type Tier,
} from "@cayfore/engine";
import confidenceFile from "../../../data/rate-confidence.json";

export interface ListedRateDetails {
  price: number | "";
  cloud: Cloud;
  region: string;
  tier: Tier;
  source: string;
  confidence: number | "";
  band: string;
  basis: string;
}

const scores = new Map(
  confidenceFile.cells.map((cell) => [`${cell.cloud}|${cell.region}|${cell.tier}|${cell.sku}`, cell]),
);

/** Describe the DBU price actually used by this workload, before portfolio discounts. */
export function listedRateDetails(result: PortfolioProjection, line: LineItem): ListedRateDetails {
  const workload = result.portfolio.workloads.find((item) => item.id === line.workloadId);
  const cloud = workload?.cloud ?? result.portfolio.cloud;
  const region = regionInfo(cloud, workload?.region ?? result.portfolio.region);
  const tier = workload?.tier ?? result.portfolio.tier;
  const provenance = workload?.rateProvenance ?? line.rateProvenance;
  const details: ListedRateDetails = {
    price: "",
    cloud,
    region: region.id,
    tier,
    source: provenance?.source ?? provenance?.label ?? "",
    confidence: "",
    band: "",
    basis: "",
  };
  const unavailable = (basis: string, band = "unpublished"): ListedRateDetails => ({ ...details, basis, band });
  if (!workload) return unavailable("Workload context is missing; a public USD/DBU rate cannot be resolved.");
  const supplied =
    workload.kind === "metered" && (workload.rateByCloud || workload.rateByPlacement || workload.fixedUsdByCloud);
  const resolved =
    supplied || result.estimate.catalogVersion !== skuCatalog.version
      ? null
      : resolveDbuRate(
          bundledPricingCatalog,
          { cloud, region: region.id, tier, factor: region.factor },
          line.sku as SkuId,
        );
  const conflict = resolved?.conflict;
  if (conflict)
    return {
      ...details,
      source: resolved!.sources.map((source) => source.url).join("; "),
      band: "conflict",
      basis: resolved!.basis,
    };
  if (line.priceStatus === "unpriced" || workload.priceStatus === "unpriced")
    return unavailable("Unpriced usage; no resolved USD/DBU rate is asserted.");
  const embedded =
    workload.kind === "metered" && (workload.rateByCloud || workload.fixedUsdByCloud || workload.rateByPlacement);
  const importedCatalogEstimate =
    workload.kind === "metered" &&
    provenance?.kind === "imported" &&
    provenance.catalogVersion === result.estimate.catalogVersion &&
    !embedded;
  if (provenance && provenance.kind !== "catalog" && !importedCatalogEstimate)
    return unavailable(
      `${provenance.kind === "imported" ? "Imported" : "Custom"} ${provenance.basis ?? "supplied"} cost or rate: ${provenance.label}. This is not a bundled public USD/DBU quote.`,
      provenance.kind,
    );
  if (workload.kind === "metered" && (workload.fixedUsdByCloud || workload.rateByPlacement))
    return unavailable(
      workload.fixedUsdByCloud
        ? "Fixed USD amount for this workload; not a USD/DBU rate."
        : "Rate applies to non-DBU units for this cloud and tier; not a USD/DBU rate.",
      "not_applicable",
    );
  if (result.estimate.catalogVersion !== skuCatalog.version)
    return unavailable(
      "The forecast's price-book version differs from the installed catalog; no rate is reconstructed.",
    );
  if (workload.kind === "metered" && workload.rateByCloud) {
    const rate = workload.rateByCloud[cloud];
    const product = productCatalog.products.find((item) => item.id === workload.productId);
    if (rate == null || !Number.isFinite(rate) || !product)
      return unavailable("No sourced catalog USD/DBU override is stored for this cloud.");
    const component = azureReferenceComponent(workload.productId);
    const exactScope = Boolean(component && component.unit === "DBU" && componentMatchesPlacement(cloud, region.id));
    return {
      ...details,
      price: exactScope ? component!.usdPerUnit : rate,
      source: exactScope ? AZURE_COMPONENT_SCOPE.sourceUrl : product.source.url,
      confidence: exactScope ? 92 : "",
      band: exactScope ? "measured" : "reference-rate",
      basis: exactScope
        ? `Exact Azure component USD/DBU rate for East US; observed ${AZURE_COMPONENT_SCOPE.observedOn}. Before portfolio discounts.`
        : "Catalog product USD/DBU override; reference-cloud rate is not scaled or verified for other regions.",
    };
  }
  if (!(line.sku in skuCatalog.rates[cloud][tier]))
    return unavailable(
      "This component is not billed in DBUs; see its cost, quantity, and source notes.",
      "not_applicable",
    );
  if (!resolved || resolved.usdPerDbu === null) return unavailable(resolved?.basis ?? "No catalog quote is available.");
  const sku = line.sku as SkuId;
  const score = scores.get(`${cloud}|${region.id}|${tier}|${sku}`);
  const prefix = importedCatalogEstimate ? "Catalog estimate for imported DBU usage; export supplied no price. " : "";
  return {
    ...details,
    price: resolved.usdPerDbu,
    source: resolved.sources.find((reference) => reference.role === "price")?.url ?? "",
    confidence: score?.score ?? "",
    band: resolved.confidence,
    basis: prefix + resolved.basis,
  };
}

export function listedRate(result: PortfolioProjection, line: LineItem): number | "" {
  return listedRateDetails(result, line).price;
}
