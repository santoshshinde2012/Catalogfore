import catalogJson from "../../../data/product-catalog.json";
import { productCatalogSchema, type Product, type ProductCatalog } from "./schema.js";

export const productCatalog: ProductCatalog = productCatalogSchema.parse(catalogJson);

export function parseProductCatalog(input: unknown): ProductCatalog {
  return productCatalogSchema.parse(input);
}

export function productsInCategory(category: Product["category"]): Product[] {
  return productCatalog.products.filter((product) => product.category === category);
}

export { productCatalogSchema, type Product, type ProductCatalog, type ProductField } from "./schema.js";
