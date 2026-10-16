import { productCatalog, type Product } from "@cayfore/catalog";
import { applyProductFormula } from "./formulas/registry.js";
import { geniePromoFactor, genieUserUsageFree } from "./formulas/genie-window.js";
import { roundMoney, uid } from "./money.js";
import { METERED_SKUS, type MeteredSku, type Workload } from "./types.js";
import { importUsageProducts } from "./usage.js";
import { createWorkload, type MenuKind } from "./workload-seeds.js";

export { geniePromoFactor, genieUserUsageFree };
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

/** Re-apply a catalog formula after an input edit. Products without a formula are unchanged. */
export function recomputeProduct(workload: Workload): Workload {
  const formula = formulaFor(workload);
  if (!formula || workload.kind !== "metered") return workload;
  return applyProductFormula(workload, formula);
}

export interface UsageProductForecast {
  workloads: Workload[];
  unmapped: string[];
  warnings: string[];
}

/** One workload per mapped product, priced from list_price when the file has it. */
export function workloadsFromUsage(text: string): UsageProductForecast {
  const imported = importUsageProducts(text);
  const warnings = [...imported.warnings];
  const workloads: Workload[] = [];
  for (const row of imported.products) {
    const known = (METERED_SKUS as readonly string[]).includes(row.engineSku);
    const sku = (known ? row.engineSku : "managed_services") as MeteredSku;
    const product = productById(row.productId);
    const name = product?.menuLabel ?? row.productId;
    if (row.dollars != null) {
      const dollars = roundMoney(row.dollars);
      workloads.push({
        id: uid(),
        name: row.unit === "DBU" ? name : `${name} (${row.unit})`,
        productId: row.productId,
        kind: "metered",
        sku,
        dbuPerMonth: 0,
        fixedUsdByCloud: { aws: dollars, azure: dollars, gcp: dollars },
      });
      continue;
    }
    if (row.unit === "DBU") {
      workloads.push({
        id: uid(),
        name,
        productId: row.productId,
        kind: "metered",
        sku,
        dbuPerMonth: row.quantity,
      });
      continue;
    }
    warnings.push(`${name} is in ${row.unit} and the file has no list price, so that row was not priced.`);
  }
  return {
    workloads,
    unmapped: imported.unmapped.map((row) => row.skuName),
    warnings,
  };
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

function formulaFor(workload: Workload): Product["formula"] {
  if (!workload.productId) return undefined;
  const product = productById(workload.productId);
  if (!product) return undefined;
  if (workload.partId) return product.parts?.find((part) => part.id === workload.partId)?.formula;
  return product.formula;
}
