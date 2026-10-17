import { parseCsv } from "../csv.js";
import { UploadError } from "../untrusted.js";
import { field, type CsvRecord } from "./fields.js";
import { systemRecord } from "./source-system.js";
import { focusRecord } from "./source-focus.js";
import type { UsageImportOptions, UsageParseResult, UsageRecord, UsageSourceId } from "./types.js";

export interface UsageSource {
  readonly id: UsageSourceId;
  readonly currencyColumn: string;
  detect(header: readonly string[]): boolean;
  read(row: CsvRecord, options: UsageImportOptions): UsageRecord | null;
}

export const usageSources: readonly UsageSource[] = [
  {
    id: "focus",
    currencyColumn: "billingcurrency",
    detect: (header) =>
      header.includes("chargeperiodstart") && (header.includes("billedcost") || header.includes("effectivecost")),
    read: focusRecord,
  },
  {
    id: "system-billing",
    currencyColumn: "currency_code",
    detect: (header) => ["usage_quantity", "dbus", "dbu"].some((column) => header.includes(column)),
    read: systemRecord,
  },
];

/** All import consumers share these records, so each upload parses CSV exactly once. */
export function parseUsageRecords(text: string, options: UsageImportOptions = {}): UsageParseResult {
  const rows = parseCsv(text);
  const selectedSource = usageSources.find((source) => source.detect(Object.keys(rows[0] ?? {}))) ?? usageSources[1];
  const source = selectedSource.id;
  const records: UsageRecord[] = [];
  const recordKeys = new Set<string>();
  const warnings = new Set<string>();
  let skippedRows = 0;
  let duplicateRows = 0;
  for (const row of rows) {
    const currency = field(row, selectedSource.currencyColumn, "currency").toUpperCase();
    if (currency && currency !== "USD")
      throw new UploadError(
        `Unsupported billing currency ${currency}. Convert the export to USD before importing; no exchange rate is assumed.`,
      );
    const record = selectedSource.read(row, options);
    if (!record) {
      skippedRows += 1;
      continue;
    }
    if (record.recordId) {
      const key = JSON.stringify(record);
      if (recordKeys.has(key)) {
        duplicateRows += 1;
        skippedRows += 1;
        continue;
      }
      recordKeys.add(key);
    }
    if (record.cost && !currency)
      warnings.add("The file has prices without a currency column; USD was assumed. Confirm the source currency.");
    records.push(record);
  }
  if (!rows.length) warnings.add("No data rows found. Export system.billing.usage as CSV with a header row.");
  if (skippedRows > duplicateRows)
    warnings.add(`${skippedRows - duplicateRows} rows with invalid dates, quantities, or costs were skipped.`);
  if (duplicateRows)
    warnings.add(
      `${duplicateRows} repeated billing records with identical record IDs and contents were excluded to avoid double-counting.`,
    );
  if (records.some((record) => !record.date))
    warnings.add("Rows without dates are treated as one monthly aggregate; period completeness cannot be verified.");
  if (source === "focus") {
    const bases = [...new Set(records.flatMap((record) => record.cost?.basis ?? []))];
    warnings.add(
      `FOCUS ${bases.join(" + ")} cost is used as exported (effective = amortized; billed = cash basis). All services in this file are included; filter unrelated cloud services before import.`,
    );
  }
  return { source, records, skippedRows, warnings: [...warnings] };
}
