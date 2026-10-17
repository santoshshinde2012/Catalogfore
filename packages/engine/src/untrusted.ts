/** Bounds for files and share links a visitor can hand the calculator. */
export const UPLOAD_MAX_CHARS = 8_000_000;
export const UPLOAD_MAX_ROWS = 100_000;
export const SHARE_MAX_CHARS = 100_000;
export const JSON_MAX_CHARS = 1_000_000;

const MAX_DEPTH = 40;
const MAX_ARRAY = 10_000;
export const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export function assertUploadText(text: string, max = UPLOAD_MAX_CHARS): void {
  if (text.length > max) throw new UploadError("That file is too large.");
}

/**
 * Parse JSON from a visitor. Rejects prototype keys, deep trees, and huge arrays.
 * A normal forecast object passes through unchanged.
 */
export function parseUntrustedJson(text: string, max = JSON_MAX_CHARS): unknown {
  if (text.length > max) throw new UploadError("That file is too large.");
  const value: unknown = JSON.parse(text);
  assertPlain(value, 0);
  return value;
}

function assertPlain(value: unknown, depth: number): void {
  if (depth > MAX_DEPTH) throw new UploadError("That file is nested too deeply.");
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) throw new UploadError("That file has too many entries.");
    for (const item of value) assertPlain(item, depth + 1);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new UploadError("That file is not plain data.");
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (DANGEROUS_KEYS.has(key)) throw new UploadError("That file is not plain data.");
    assertPlain(record[key], depth + 1);
  }
}
