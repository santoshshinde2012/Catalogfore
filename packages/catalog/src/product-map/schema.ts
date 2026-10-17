import { z } from "zod";
import type { Product } from "../schema.js";

const id = z.string().regex(/^[a-z0-9_]+$/);
const text = z.string().trim().min(1);
const ids = z.array(id).min(1);
const source = z
  .object({
    id,
    title: text,
    url: z.string().url().startsWith("https://", "Sources must use HTTPS"),
  })
  .strict();
const domain = z
  .object({
    id,
    name: text,
    verb: text,
    summary: text,
    useCases: z.array(text).min(1),
    billingContext: text,
    sourceIds: ids,
  })
  .strict();
const entry = z
  .object({
    id,
    productId: id.optional(),
    name: text.optional(),
    aliases: z.array(text),
    domainId: id,
    relatedDomainIds: z.array(id),
    summary: text.optional(),
    useCases: z.array(text).min(1),
    billingContext: text.optional(),
    sourceIds: ids,
  })
  .strict();
const relationship = z.object({ from: id, to: id, label: text, sourceIds: ids }).strict();
const journey = z.object({ id, name: text, summary: text, steps: z.array(id).min(2), sourceIds: ids }).strict();

export const productMapDocumentSchema = z
  .object({
    version: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
    reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    disclaimer: text,
    domains: z.array(domain).min(1),
    sources: z.array(source).min(1),
    entries: z.array(entry).min(1),
    relationships: z.array(relationship),
    journeys: z.array(journey),
  })
  .strict();

export type ProductMapDocument = z.infer<typeof productMapDocumentSchema>;
export type ProductMapSource = z.infer<typeof source>;
export type ProductMapDomain = z.infer<typeof domain>;
export type ProductMapRelationship = z.infer<typeof relationship>;
export type ProductMapJourney = z.infer<typeof journey>;
export interface ProductMapEntry {
  id: string;
  kind: "catalog-product" | "platform-service";
  product?: Product;
  name: string;
  aliases: string[];
  domainId: string;
  relatedDomainIds: string[];
  summary: string;
  useCases: string[];
  billingContext: string;
  sources: ProductMapSource[];
}
export interface ProductMap extends Omit<ProductMapDocument, "entries"> {
  entries: ProductMapEntry[];
}
export interface ProductMapFilters {
  query?: string;
  domainId?: string;
  kind?: ProductMapEntry["kind"];
}
