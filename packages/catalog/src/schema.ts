import { z } from "zod";

export const CATEGORY_IDS = ["data_engineering", "warehousing_bi", "ai_ml", "apps_oltp", "governance_sharing"] as const;

export const TEMPLATES = [
  "jobs",
  "all_purpose",
  "dlt",
  "serverless_jobs",
  "serverless_notebooks",
  "serverless_dlt",
  "sql",
  "serving",
  "foundation",
  "search",
  "app",
  "lakebase",
  "storage",
  "egress",
  "metered",
] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Named conversions. The engine applies these. The catalog does not store executable formulas. */
export const FORMULAS = [
  "genie_code",
  "genie_llm_free",
  "genie_sql",
  "dashboard_sql",
  "ai_parse",
  "custom_fm",
  "launch",
  "azure_data_processed",
] as const;

const fieldSchema = z.object({
  path: z.string().regex(/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)?$/),
  label: z.string().min(1),
  type: z.enum(["number", "select", "boolean"]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

const patchValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.union([z.string(), z.number(), z.boolean()])),
]);

const partSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  template: z.enum(TEMPLATES),
  editor: z.enum(["builtin", "schema"]).default("schema"),
  formula: z.enum(FORMULAS).optional(),
  fields: z.array(fieldSchema).default([]),
  patch: z.record(patchValue).default({}),
});

export const productSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  menuLabel: z.string().min(1).max(80),
  summary: z.string().min(1),
  category: z.enum(CATEGORY_IDS),
  billingUnit: z.string().min(1),
  sku: z.string().min(1).nullable(),
  /** distinct: this row has its own list rate. reused_sku: dollars come from another SKU. unpublished: no rate is applied. */
  listPrice: z.enum(["distinct", "reused_sku", "unpublished"]),
  published: z.boolean(),
  confidence: z.enum(["measured", "cited", "secondary", "unpublished"]),
  automation: z.enum(["azure-retail-prices", "manual"]),
  template: z.enum(TEMPLATES),
  editor: z.enum(["builtin", "schema"]),
  drivers: z.array(z.string().min(1)).min(1),
  defaults: z.string().min(1),
  source: z.object({
    title: z.string().min(1),
    url: z.string().url(),
    fetchedOn: date,
  }),
  note: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
  patch: z.record(patchValue).default({}),
  azureMeterNames: z.array(z.string().min(1)).default([]),
  /** Converts editable inputs into DBU or dollars. Omitted when `parts` owns the formulas. */
  formula: z.enum(FORMULAS).optional(),
  /** One product, several billable SKUs. Each part becomes its own workload. */
  parts: z.array(partSchema).optional(),
});

export const productCatalogSchema = z
  .object({
    version: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
    verifiedOn: date,
    disclaimer: z.string().min(1),
    categories: z.array(z.object({ id: z.enum(CATEGORY_IDS), label: z.string().min(1) })).length(CATEGORY_IDS.length),
    knownAzureMeters: z.array(z.string().min(1)).min(1),
    products: z.array(productSchema).min(1),
  })
  .superRefine((catalog, ctx) => {
    const ids = new Set<string>();
    const labels = new Set<string>();
    for (const [index, product] of catalog.products.entries()) {
      if (ids.has(product.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate product id ${product.id}`,
          path: ["products", index, "id"],
        });
      }
      ids.add(product.id);
      if (labels.has(product.menuLabel)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate menu label ${product.menuLabel}`,
          path: ["products", index, "menuLabel"],
        });
      }
      labels.add(product.menuLabel);
      if (product.listPrice === "unpublished" && (product.published || product.confidence !== "unpublished")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${product.id} is unpublished and must say so`,
          path: ["products", index, "listPrice"],
        });
      }
      if (product.listPrice === "distinct" && (!product.published || product.confidence === "unpublished")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${product.id} claims a distinct list rate`,
          path: ["products", index, "listPrice"],
        });
      }
      if (product.listPrice === "reused_sku" && product.published) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${product.id} reuses a SKU and is not its own published rate`,
          path: ["products", index, "published"],
        });
      }
      const hasParts = (product.parts?.length ?? 0) > 0;
      if (
        product.editor === "schema" &&
        product.listPrice !== "unpublished" &&
        product.fields.length === 0 &&
        !hasParts
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${product.id} needs input fields`,
          path: ["products", index, "fields"],
        });
      }
      if (product.formula && product.fields.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${product.id} formula needs input fields`,
          path: ["products", index, "formula"],
        });
      }
      for (const [partIndex, part] of (product.parts ?? []).entries()) {
        if (part.formula && part.fields.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${product.id} part ${part.id} formula needs input fields`,
            path: ["products", index, "parts", partIndex, "fields"],
          });
        }
      }
      for (const meter of product.azureMeterNames) {
        if (!catalog.knownAzureMeters.includes(meter)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${product.id} names an Azure meter that is not in knownAzureMeters`,
            path: ["products", index, "azureMeterNames"],
          });
        }
      }
    }
    const categories = new Set(catalog.categories.map((category) => category.id));
    for (const id of CATEGORY_IDS) {
      if (!categories.has(id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `missing category ${id}`, path: ["categories"] });
      }
    }
  });

export type Product = z.infer<typeof productSchema>;
export type ProductCatalog = z.infer<typeof productCatalogSchema>;
export type ProductField = z.infer<typeof fieldSchema>;
