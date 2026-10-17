import { productCatalog } from "@cayfore/catalog";
import {
  referenceRegion,
  firstPartyDbuRate,
  firstPartyBaseDbuRate,
  firstPartyDbuConflict,
  regionInfo,
  regionalSkuRate,
  skuCatalog,
  skuRate,
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
const SECONDARY_SOURCE = "https://www.flexera.com/blog/finops/databricks-pricing-guide/";

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
  const conflict = !supplied && firstPartyDbuConflict(cloud, region.id, tier, line.sku as SkuId);
  if (conflict)
    return {
      ...details,
      source: conflict.sources.map((source) => source.url).join("; "),
      band: "conflict",
      basis: `Conflicting first-party prices (${conflict.values.map((value) => `$${value}/DBU`).join(" versus ")}); the qualified public rate is withheld. ${conflict.sources.map((source) => source.locator).join("; ")}`,
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
  if (workload.kind === "metered" && workload.rateByCloud) {
    const rate = workload.rateByCloud[cloud];
    const product = productCatalog.products.find((item) => item.id === workload.productId);
    if (rate == null || !Number.isFinite(rate) || !product)
      return unavailable("No sourced catalog USD/DBU override is stored for this cloud.");
    const exactScope = cloud === "azure" && region.id === "eastus" && product.automation === "azure-retail-prices";
    return {
      ...details,
      price: rate,
      source: product.source.url,
      confidence: exactScope ? 92 : "",
      band: exactScope ? "measured" : "reference-rate",
      basis: "Catalog product USD/DBU override; reference-cloud rate is not scaled or verified for other regions.",
    };
  }
  if (!(line.sku in skuCatalog.rates[cloud][tier]))
    return unavailable(
      "This component is not billed in DBUs; see its cost, quantity, and source notes.",
      "not_applicable",
    );
  if (result.estimate.catalogVersion !== skuCatalog.version)
    return unavailable(
      "The forecast's price-book version differs from the installed catalog; no rate is reconstructed.",
    );
  const sku = line.sku as SkuId;
  const regional = regionalSkuRate(cloud, region.id, tier, sku);
  const observed = firstPartyDbuRate(cloud, region.id, tier, sku);
  const reference = firstPartyBaseDbuRate(cloud, tier, sku);
  const price = regional ?? skuRate(cloud, tier, sku) * region.factor;
  if (!Number.isFinite(price)) return unavailable("A finite catalog USD/DBU rate could not be resolved.");
  const score = scores.get(`${cloud}|${region.id}|${tier}|${sku}`);
  const prefix = importedCatalogEstimate ? "Catalog estimate for imported DBU usage; export supplied no price. " : "";
  return {
    ...details,
    price,
    source: observed?.sourceUrl ?? reference?.sourceUrl ?? SECONDARY_SOURCE,
    confidence: score?.score ?? "",
    band: score?.band ?? "",
    basis:
      prefix +
      (regional == null
        ? `${reference ? "First-party reference" : "Bundled secondary reference"} USD/DBU base × region factor ${region.factor}; reference region ${referenceRegion[cloud]}. Regional pricing remains a planning proxy. Before portfolio discounts.`
        : `Exact ${cloud === "azure" ? "Azure consumption meter" : "Databricks first-party USD/DBU observation"} for this workload's region; observed ${observed?.observedOn ?? "date not recorded"}. Before portfolio discounts.`),
  };
}

export function listedRate(result: PortfolioProjection, line: LineItem): number | "" {
  return listedRateDetails(result, line).price;
}
