import { importUsageCsv, importUsageProducts, type ProductUsageImport } from "./usage.js";
import type { UsageImport } from "./types.js";

/** A text import. A new file shape is a new entry, not a new branch in the page. */
export interface TextImporter<T> {
  readonly id: string;
  parse(text: string): T;
}

export const usageImporters: readonly TextImporter<UsageImport | ProductUsageImport>[] = [
  { id: "dbu-mix", parse: importUsageCsv },
  { id: "products", parse: importUsageProducts },
];
