const FORMULA_PREFIX = /^[=+\-@\t\r\n＝＋－＠]/;

/** Prefixes known formula triggers for the initial spreadsheet import; re-saving can remove escaping. */
export function neutralizeSpreadsheetFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

/** Drops control characters before they go into a PDF text operator. Keeps tab and newline. */
export function pdfPlain(value: string, max = 2_000): string {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    const control = code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31);
    if (control) continue;
    out += char;
    if (out.length >= max) break;
  }
  return out;
}
