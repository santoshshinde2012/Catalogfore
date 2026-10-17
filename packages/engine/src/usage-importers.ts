import { importUsageCsv, importUsageProducts, type ProductUsageImport } from "./usage.js";
import type { UsageImport } from "./types.js";
export { usageSources, type UsageSource } from "./usage/parse.js";

/** Compatibility views; source detection and record parsing live in usageSources. */
export interface TextImporter<T> {
  readonly id: string;
  parse(text: string): T;
}

export const usageImporters: readonly TextImporter<UsageImport | ProductUsageImport>[] = [
  { id: "dbu-mix", parse: importUsageCsv },
  { id: "products", parse: importUsageProducts },
];
