import { DANGEROUS_KEYS, UPLOAD_MAX_ROWS, UploadError, assertUploadText } from "./untrusted.js";

export function parseCsv(text: string): Record<string, string>[] {
  assertUploadText(text);
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  if (rows.length - 1 > UPLOAD_MAX_ROWS) throw new UploadError("That file has too many rows.");
  const header = rows[0].map((value) => value.trim().toLowerCase());
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = Object.create(null);
    header.forEach((key, index) => {
      if (!key || DANGEROUS_KEYS.has(key)) return;
      record[key] = values[index] ?? "";
    });
    return record;
  });
}
