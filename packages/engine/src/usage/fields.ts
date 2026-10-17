import type { Cloud } from "../types.js";
import { DANGEROUS_KEYS, UploadError, parseUntrustedJson } from "../untrusted.js";

export type CsvRecord = Record<string, string>;

export function field(row: CsvRecord, ...keys: string[]): string {
  for (const key of keys) if (row[key]?.trim()) return row[key].trim();
  return "";
}

export function numberField(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const number = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : undefined;
}

export function dateField(raw: string): string | null {
  const date = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : null;
}

export function cloudField(raw: string): Cloud | undefined {
  if (/^(aws|amazon web services)$/i.test(raw)) return "aws";
  if (/^(azure|microsoft azure|microsoft)$/i.test(raw)) return "azure";
  if (/^(gcp|google cloud|google)$/i.test(raw)) return "gcp";
  return undefined;
}

/** Databricks structs may be JSON or flattened columns. Never trust object keys. */
export function objectField(row: CsvRecord, key: string, aliases: readonly string[] = []): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  const raw = field(row, key);
  if (raw.length > 64_000) throw new UploadError(`The ${key} column is too large.`);
  if (raw) {
    if (raw.startsWith("{")) {
      let parsed: unknown;
      try {
        parsed = parseUntrustedJson(raw, 64_000);
      } catch (error) {
        if (error instanceof UploadError) throw error;
        throw new UploadError(`The ${key} column contains invalid JSON.`);
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new UploadError(`The ${key} column must contain a JSON object.`);
      }
      for (const [name, value] of Object.entries(parsed)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          result[name] = String(value);
        }
      }
    } else {
      for (const pair of raw.split(/[;,]/)) {
        const index = pair.indexOf("=");
        const name = pair.slice(0, index).trim();
        if (index > 0 && !DANGEROUS_KEYS.has(name)) result[name] = pair.slice(index + 1).trim();
      }
    }
  }
  for (const [name, value] of Object.entries(row)) {
    const flattened = name.startsWith(`${key}.`) ? name.slice(key.length + 1) : null;
    if (flattened && !DANGEROUS_KEYS.has(flattened) && value) result[flattened] = value;
  }
  for (const name of aliases) if (row[name]) result[name] = row[name];
  return result;
}
