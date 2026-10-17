import type { ProductCatalog } from "../schema.js";
import type { ProductMapDocument } from "./schema.js";

type Issue = (path: (string | number)[], message: string) => void;

/** Reject incomplete maps rather than silently omitting a catalog product or a broken relationship. */
export function validateMapReferences(document: ProductMapDocument, catalog: ProductCatalog, issue: Issue): void {
  const sources = uniqueIds(document.sources, "sources", issue);
  const domains = uniqueIds(document.domains, "domains", issue);
  const entries = uniqueIds(document.entries, "entries", issue);
  uniqueIds(document.journeys, "journeys", issue);
  const products = new Set(catalog.products.map((product) => product.id));
  const mappedProducts = new Set<string>();
  function checkSources(sourceIds: string[], path: (string | number)[]) {
    checkReferences(sourceIds, sources, [...path, "sourceIds"], "source", issue);
  }
  for (const [index, domain] of document.domains.entries()) checkSources(domain.sourceIds, ["domains", index]);
  for (const [index, entry] of document.entries.entries()) {
    const path = ["entries", index];
    checkReferences([entry.domainId], domains, [...path, "domainId"], "domain", issue);
    checkReferences(entry.relatedDomainIds, domains, [...path, "relatedDomainIds"], "domain", issue);
    if (entry.relatedDomainIds.includes(entry.domainId)) {
      issue([...path, "relatedDomainIds"], `Entry ${entry.id} repeats its primary domain`);
    }
    checkSources(entry.sourceIds, path);
    if (entry.productId) {
      if (!products.has(entry.productId)) issue([...path, "productId"], `Unknown catalog product ${entry.productId}`);
      if (mappedProducts.has(entry.productId)) {
        issue([...path, "productId"], `Duplicate product mapping ${entry.productId}`);
      }
      mappedProducts.add(entry.productId);
    } else {
      for (const field of ["name", "summary", "billingContext"] as const) {
        if (!entry[field]) issue([...path, field], `Platform service ${entry.id} requires ${field}`);
      }
    }
  }
  for (const productId of products) {
    if (!mappedProducts.has(productId)) issue(["entries"], `Missing product mapping ${productId}`);
  }
  const relationships = new Set<string>();
  for (const [index, relationship] of document.relationships.entries()) {
    const path = ["relationships", index];
    for (const field of ["from", "to"] as const) {
      if (!entries.has(relationship[field])) {
        issue([...path, field], `Unknown relationship entry ${relationship[field]}`);
      }
    }
    if (relationship.from === relationship.to) issue(path, "A relationship must connect different entries");
    const key = JSON.stringify([relationship.from, relationship.to, relationship.label]);
    if (relationships.has(key)) issue(path, "Duplicate relationship");
    relationships.add(key);
    checkSources(relationship.sourceIds, path);
  }
  for (const [index, journey] of document.journeys.entries()) {
    checkReferences(journey.steps, entries, ["journeys", index, "steps"], "journey entry", issue);
    checkSources(journey.sourceIds, ["journeys", index]);
  }
}

function uniqueIds(items: { id: string }[], field: string, issue: Issue): Set<string> {
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) issue([field, index, "id"], `Duplicate ${field} ID ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function checkReferences(
  references: string[],
  ids: Set<string>,
  path: (string | number)[],
  label: string,
  issue: Issue,
) {
  const seen = new Set<string>();
  for (const [index, reference] of references.entries()) {
    if (!ids.has(reference)) issue([...path, index], `Unknown ${label} ${reference}`);
    if (seen.has(reference)) issue([...path, index], `Duplicate ${label} ${reference}`);
    seen.add(reference);
  }
}
