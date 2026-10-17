import fc from "fast-check";
import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.js";
import { blankPortfolio, decodePortfolio, encodePortfolio, parseSavedForecast } from "./portfolio.js";
import { neutralizeSpreadsheetFormula } from "./spreadsheet.js";
import { UploadError, parseUntrustedJson } from "./untrusted.js";
import type { Portfolio } from "./types.js";

// Fixed by default so CI failures reproduce. fast-check reports the seed and shrink
// path; use CAYFORE_FUZZ_SEED / CAYFORE_FUZZ_PATH with Vitest -t to replay one case.
const seed = Number(process.env.CAYFORE_FUZZ_SEED ?? 20261018);
if (!Number.isSafeInteger(seed)) throw new Error("CAYFORE_FUZZ_SEED must be an integer.");
const parameters = {
  seed,
  numRuns: 500,
  ...(process.env.CAYFORE_FUZZ_PATH ? { path: process.env.CAYFORE_FUZZ_PATH } : {}),
};
const text = fc.string({ unit: "grapheme", maxLength: 80 });
const plainJson = fc.anything({
  maxDepth: 6,
  maxKeys: 6,
  key: text.map((key) => `field:${key}`),
  values: [fc.constant(null), fc.boolean(), fc.double({ noNaN: true, noDefaultInfinity: true }), text],
});
const forbiddenKey = fc.constantFrom("__proto__", "constructor", "prototype");
const wrappers = fc.array(fc.boolean(), { maxLength: 16 });

function wrapJson(json: string, levels: boolean[]): string {
  return levels.reduce((nested, array) => (array ? `[${nested}]` : `{"payload":${nested}}`), json);
}

// An RFC 4180 writer independent of the import parser: always quote fields,
// preserve embedded newlines, and escape each literal quote by doubling it.
function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

describe("property-based fuzzing at untrusted input boundaries", () => {
  it("preserves bounded plain JSON data without changing its values", () => {
    fc.assert(
      fc.property(plainJson, (value) => {
        const json = JSON.stringify(value);
        expect(parseUntrustedJson(json)).toEqual(JSON.parse(json));
      }),
      parameters,
    );
  });

  it("rejects prototype keys at arbitrary object and array positions", () => {
    fc.assert(
      fc.property(forbiddenKey, text, wrappers, (key, value, levels) => {
        const before = Object.getOwnPropertyDescriptors(Object.prototype);
        const payload = JSON.stringify({ [key]: { cayforeFuzzPolluted: value } });
        expect(() => parseUntrustedJson(wrapJson(payload, levels))).toThrow(UploadError);
        expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(before);
        expect(({} as { cayforeFuzzPolluted?: string }).cayforeFuzzPolluted).toBeUndefined();
      }),
      parameters,
    );
  });

  it("enforces the nesting limit for mixed object and array trees", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 35, maxLength: 46 }), (levels) => {
        const json = wrapJson("null", levels);
        if (levels.length > 40) expect(() => parseUntrustedJson(json)).toThrow(/nested too deeply/);
        else expect(parseUntrustedJson(json)).toEqual(JSON.parse(json));
      }),
      parameters,
    );
  });

  it("accepts the exact text size limit and rejects one character beyond it", () => {
    fc.assert(
      fc.property(text, (value) => {
        const json = JSON.stringify({ value });
        expect(parseUntrustedJson(json, json.length)).toEqual({ value });
        expect(() => parseUntrustedJson(json, json.length - 1)).toThrow(/too large/);
      }),
      parameters,
    );
  });

  it("round-trips quoted CSV cells while discarding dangerous header keys", () => {
    const cell = fc.oneof(text, fc.constantFrom('a,"b"', "\r\n", "\n", "\r", "\uFEFF", "", "=SUM(A1:A9)"));
    fc.assert(
      fc.property(
        fc.array(fc.tuple(cell, cell, cell), { minLength: 1, maxLength: 12 }),
        fc.constantFrom("\n", "\r\n", "\r"),
        fc.boolean(),
        (rows, newline, bom) => {
          const header = ["row_id", " SKU_Name ", "usage_quantity", "note", "__PROTO__", "constructor", "prototype"];
          const lines = [
            header,
            ...rows.map((row, index) => [String(index), ...row, "polluted", "polluted", "polluted"]),
          ];
          const csv = `${bom ? "\uFEFF" : ""}${lines.map((row) => row.map(csvCell).join(",")).join(newline)}${newline}`;
          const parsed = parseCsv(csv);
          expect(parsed).toHaveLength(rows.length);
          rows.forEach(([sku, quantity, note], index) => {
            expect(Object.getPrototypeOf(parsed[index])).toBeNull();
            expect({ ...parsed[index] }).toEqual({
              row_id: String(index),
              sku_name: sku,
              usage_quantity: quantity,
              note,
            });
          });
        },
      ),
      parameters,
    );
  });

  // OWASP's CSV Injection list includes LF and full-width locale variants as
  // well as ASCII operators. These assertions concern the initial CSV export.
  it.each(["=", "+", "-", "@", "\t", "\r", "\n", "＝", "＋", "－", "＠"])(
    "keeps formula prefix %j inert and preserves its payload through CSV quoting",
    (prefix) => {
      fc.assert(
        fc.property(text, (suffix) => {
          const input = `${prefix}${suffix}`;
          const safe = neutralizeSpreadsheetFormula(input);
          expect(safe[0]).toBe("'");
          expect(safe.slice(1)).toBe(input);
          expect(neutralizeSpreadsheetFormula(safe)).toBe(safe);
          expect(parseCsv(`value\r\n${csvCell(safe)}\r\n`)[0]?.value).toBe(safe);
        }),
        parameters,
      );
    },
  );

  it("leaves ordinary text unchanged during spreadsheet neutralization", () => {
    fc.assert(
      fc.property(text, (suffix) => {
        const label = `Forecast ${suffix}`;
        expect(neutralizeSpreadsheetFormula(label)).toBe(label);
      }),
      parameters,
    );
  });

  it("handles arbitrary share-link text without throwing or returning an invalid forecast", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 256 }), (encoded) => {
        const portfolio = decodePortfolio(encoded);
        if (portfolio !== null) expect(parseSavedForecast(portfolio).ok).toBe(true);
      }),
      parameters,
    );
  });

  it("rejects compressed share payloads containing prototype keys", () => {
    fc.assert(
      fc.property(forbiddenKey, text, (key, value) => {
        const payload = { ...blankPortfolio(), [key]: { cayforeFuzzPolluted: value } };
        expect(decodePortfolio(compressToEncodedURIComponent(JSON.stringify(payload)))).toBeNull();
      }),
      parameters,
    );
  });

  it("preserves forecast values while keeping ownership attribution out of share links", () => {
    fc.assert(
      fc.property(text, text, fc.constantFrom("aws", "azure", "gcp"), (label, owner, cloud) => {
        const name = `F${label.slice(0, 60)}X`;
        const portfolio: Portfolio = {
          ...blankPortfolio(cloud),
          name,
          usage: {
            source: "system-billing",
            selectedMonth: "2026-09",
            costBasis: "list",
            currency: "USD",
            observedMonths: [{ period: "2026-09", amount: 100 }],
            observedUnit: "usd",
            coverage: { pricedRows: 1, unpricedRows: 0, usedRows: 1, skippedRows: 0 },
            warnings: [],
            attribution: [{ key: `owner:${owner}`, label: name, amount: 100, quantity: 10, rows: 1, unpricedRows: 0 }],
          },
        };
        const original = structuredClone(portfolio);
        const restored = decodePortfolio(encodePortfolio(portfolio));
        expect(restored?.name).toBe(name);
        expect(restored?.cloud).toBe(cloud);
        expect(restored?.usage?.attribution).toBeUndefined();
        expect(restored?.usage?.observedMonths).toEqual(portfolio.usage?.observedMonths);
        expect(portfolio).toEqual(original);
      }),
      parameters,
    );
  });
});
