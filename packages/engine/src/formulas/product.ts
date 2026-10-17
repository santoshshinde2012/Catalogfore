import { productCatalog, type Product } from "@cayfore/catalog";
import type { Workload } from "../types.js";
import { applyProductFormula } from "./registry.js";

/** Imported monetary baselines are not replaced with product default quantities. */
export function recomputeProduct(workload: Workload, asOf?: string): Workload {
  if (workload.rateProvenance?.kind === "imported") return workload;
  const formula = formulaFor(workload);
  if (!formula || workload.kind !== "metered") return workload;
  return applyProductFormula(workload, formula, asOf);
}

export function formulaFor(workload: Workload): Product["formula"] {
  if (!workload.productId) return undefined;
  const product = productCatalog.products.find((item) => item.id === workload.productId);
  if (!product) return undefined;
  if (workload.partId) return product.parts?.find((part) => part.id === workload.partId)?.formula;
  return product.formula;
}
