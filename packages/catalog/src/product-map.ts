import { z } from "zod";
import type { ProductCatalog } from "./schema.js";
import { validateMapReferences } from "./product-map/references.js";
import {
  productMapDocumentSchema,
  type ProductMap,
  type ProductMapFilters,
  type ProductMapEntry,
} from "./product-map/schema.js";

export type {
  ProductMap,
  ProductMapDocument,
  ProductMapDomain,
  ProductMapEntry,
  ProductMapFilters,
  ProductMapJourney,
  ProductMapRelationship,
  ProductMapSource,
} from "./product-map/schema.js";

/** Join independently researched domain metadata with the current, validated pricing catalog. */
export function parseProductMap(input: unknown, catalog: ProductCatalog): ProductMap {
  const document = productMapDocumentSchema
    .superRefine((value, context) => {
      validateMapReferences(value, catalog, (path, message) => {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message });
      });
    })
    .parse(input);
  const products = new Map(catalog.products.map((product) => [product.id, product]));
  const sources = new Map(document.sources.map((source) => [source.id, source]));
  return {
    ...document,
    entries: document.entries.map((entry): ProductMapEntry => {
      const product = entry.productId ? products.get(entry.productId) : undefined;
      const references = entry.sourceIds.map((id) => sources.get(id)!);
      if (product && !references.some((reference) => reference.url === product.source.url)) {
        references.push({ id: `catalog_${product.id}`, title: product.source.title, url: product.source.url });
      }
      return {
        id: entry.id,
        kind: product ? "catalog-product" : "platform-service",
        ...(product ? { product } : {}),
        name: entry.name ?? product!.menuLabel,
        aliases: entry.aliases,
        domainId: entry.domainId,
        relatedDomainIds: entry.relatedDomainIds,
        summary: entry.summary ?? product!.summary,
        useCases: entry.useCases,
        billingContext: entry.billingContext ?? product!.note,
        sources: references,
      };
    }),
  };
}

/** Domain relevance includes the primary domain and explicitly researched cross-domain links. */
export function filterProductMapEntries(map: ProductMap, filters: ProductMapFilters = {}): ProductMapEntry[] {
  const terms = normalize(filters.query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const domainNames = new Map(map.domains.map((domain) => [domain.id, domain.name]));
  return map.entries.filter((entry) => {
    if (filters.kind && entry.kind !== filters.kind) return false;
    if (filters.domainId && entry.domainId !== filters.domainId && !entry.relatedDomainIds.includes(filters.domainId)) {
      return false;
    }
    if (!terms.length) return true;
    const text = normalize(
      [
        entry.id,
        entry.name,
        entry.product?.menuLabel,
        entry.product?.name,
        ...entry.aliases,
        entry.summary,
        ...entry.useCases,
        domainNames.get(entry.domainId),
        ...entry.relatedDomainIds.map((domain) => domainNames.get(domain)),
      ].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .trim();
}
