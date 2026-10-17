import productMapJson from "../../../data/product-map.json";
import { productCatalog } from "./index.js";
import { filterProductMapEntries, parseProductMap, type ProductMapFilters } from "./product-map.js";

export * from "./product-map.js";

/** Optional educational metadata: pricing-only consumers do not import or validate this document. */
export const productMap = parseProductMap(productMapJson, productCatalog);

export function filterMapEntries(filters: ProductMapFilters = {}) {
  return filterProductMapEntries(productMap, filters);
}

export function mapEntryById(id: string) {
  return productMap.entries.find((entry) => entry.id === id);
}

export function domainById(id: string) {
  return productMap.domains.find((domain) => domain.id === id);
}
