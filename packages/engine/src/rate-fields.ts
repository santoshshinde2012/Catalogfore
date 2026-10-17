import { productCatalog } from "@cayfore/catalog";
import { rateProvenanceOf } from "./pricing-fields.js";
import { cloudRates, placementRates } from "./portfolio-fields.js";

/** Catalog snapshots are rehydrated from the installed price book, never arbitrary shared rates. */
export function normalizedMeteredRates(input: Record<string, unknown>) {
  const provenance = rateProvenanceOf(input.rateProvenance);
  const embedded = input.rateByCloud || input.fixedUsdByCloud || input.rateByPlacement;
  const product = productCatalog.products.find((item) => item.id === input.productId);
  const patch = input.partId ? product?.parts?.find((part) => part.id === input.partId)?.patch : product?.patch;
  const trustedCustom = provenance && provenance.kind !== "catalog";
  const rates = trustedCustom ? input : (patch ?? {});
  const rateByCloud = cloudRates(rates.rateByCloud);
  const fixedUsdByCloud = cloudRates(rates.fixedUsdByCloud, provenance?.kind === "imported");
  const rateByPlacement = placementRates(rates.rateByPlacement);
  const rejected = Boolean(embedded) && !trustedCustom && !rateByCloud && !fixedUsdByCloud && !rateByPlacement;
  return {
    ...(rateByCloud ? { rateByCloud } : {}),
    ...(fixedUsdByCloud ? { fixedUsdByCloud } : {}),
    ...(rateByPlacement ? { rateByPlacement } : {}),
    ...(rejected ? { priceStatus: "unpriced" as const } : {}),
    ...(product && !trustedCustom
      ? {
          rateProvenance: {
            kind: "catalog" as const,
            currency: "USD" as const,
            label: "Repriced from installed catalog",
            catalogVersion: productCatalog.version,
            verifiedOn: productCatalog.verifiedOn,
          },
        }
      : {}),
  };
}
