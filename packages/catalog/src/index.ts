import catalogJson from "../../../data/product-catalog.json";
import { err, ok, type Result } from "./result.js";
import { productCatalogSchema, type Product, type ProductCatalog } from "./schema.js";

export const productCatalog: ProductCatalog = productCatalogSchema.parse(catalogJson);

export function parseProductCatalog(input: unknown): ProductCatalog {
  return productCatalogSchema.parse(input);
}

/** Validate a catalog document. A bad document is an error value. */
export function parseProductCatalogResult(input: unknown): Result<ProductCatalog> {
  const parsed = productCatalogSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues.map((issue) => issue.message).join("; "));
  return ok(parsed.data);
}

export function productsInCategory(category: Product["category"]): Product[] {
  return productCatalog.products.filter((product) => product.category === category);
}

export { FORMULAS, productCatalogSchema, type Product, type ProductCatalog, type ProductField } from "./schema.js";
export { err, ok, type Result } from "./result.js";
