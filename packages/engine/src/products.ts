import { productCatalog, type Product } from "@cayfore/catalog";
import { recomputeProduct } from "./formulas/product.js";
import { geniePromoFactor, genieUserUsageFree } from "./formulas/genie-window.js";
import type { Workload } from "./types.js";
import { previewUsageImport } from "./usage/preview.js";
import type { UsageImportOptions, UsageImportPreview } from "./usage/types.js";
import { workloadsFromUsagePreview, type UsageProductForecast } from "./usage/workloads.js";
import { createWorkload, type MenuKind } from "./workload-seeds.js";

export { geniePromoFactor, genieUserUsageFree };
export { formulaFor, recomputeProduct } from "./formulas/product.js";
export { forecastProducts, type ProductForecast, type ProductForecastLine } from "./product-forecast.js";

export function listProducts(): readonly Product[] {
  return productCatalog.products;
}

export function productCatalogMeta(): { version: string; verifiedOn: string; disclaimer: string } {
  return {
    version: productCatalog.version,
    verifiedOn: productCatalog.verifiedOn,
    disclaimer: productCatalog.disclaimer,
  };
}

export function productCategories(): { id: Product["category"]; label: string }[] {
  return productCatalog.categories;
}

export function productById(id: string): Product | undefined {
  return productCatalog.products.find((product) => product.id === id);
}

export function workloadForProduct(productId: string): Workload {
  const workloads = workloadsForProduct(productId);
  return workloads[0];
}

/** Every billable part of a product. A product with no parts is a one-element list. */
export function workloadsForProduct(productId: string): Workload[] {
  const product = productById(productId);
  if (!product) throw new Error(`Unknown product "${productId}".`);
  if (product.parts && product.parts.length > 0) {
    return product.parts.map((part) =>
      recomputeProduct({
        ...applyPatch(createWorkload(part.template as MenuKind), part.patch),
        productId: product.id,
        partId: part.id,
        name: part.name,
      }),
    );
  }
  return [
    recomputeProduct({
      ...applyPatch(createWorkload(product.template as MenuKind), product.patch),
      productId: product.id,
      name: product.menuLabel,
    }),
  ];
}

export type { UsageProductForecast } from "./usage/workloads.js";

/** One month's known costs plus explicit catalog estimates and unpriced quantities. */
export function workloadsFromUsage(
  input: string | UsageImportPreview,
  options: UsageImportOptions = {},
): UsageProductForecast {
  return workloadsFromUsagePreview(typeof input === "string" ? previewUsageImport(input, options) : input);
}

function applyPatch(workload: Workload, patch: Product["patch"]): Workload {
  const next: Record<string, unknown> = { ...workload };
  for (const [key, value] of Object.entries(patch)) {
    const current = next[key];
    if (isRecord(value) && isRecord(current)) next[key] = { ...current, ...value };
    else next[key] = value;
  }
  return next as unknown as Workload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
