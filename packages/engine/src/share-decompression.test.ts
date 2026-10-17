import fc from "fast-check";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { blankPortfolio, encodePortfolio } from "./portfolio.js";
import { decompressShare } from "./share-decompression.js";
import { SHARE_MAX_CHARS } from "./untrusted.js";

const parameters = { seed: 20261018, numRuns: 500 };
const utf16 = fc
  .array(fc.integer({ min: 0, max: 0xffff }), { maxLength: 256 })
  .map((units) => String.fromCharCode(...units));
const legacy = {
  encoded:
    "N4IgbgpgTgzglgewHYgFwEYA0IkEMC2EaIAMhAOa4DGAngAQBmCUEVuMALiNlQDYIBXACbFcAdxjcQLcohSoQAmAFoI7DsvRSOcaMQAOLfHAH4pY5gGt+uIZNQBtALoBfIA",
  json: '{"version":1,"name":"Legacy forecast","cloud":"aws","region":"us-east-1","tier":"premium","workloads":[]}',
};

// Write explicit protocol fields to exercise invalid dictionary references.
function stream(...fields: [width: number, value: number][]): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";
  const bits = fields.flatMap(([width, value]) => Array.from({ length: width }, (_, bit) => (value >> bit) & 1));
  while (bits.length % 6) bits.push(0);
  const symbols = [];
  for (let index = 0; index < bits.length; index += 6) {
    symbols.push(alphabet[Number.parseInt(bits.slice(index, index + 6).join(""), 2)]);
  }
  return symbols.join("");
}

describe("bounded URI-safe share decompression", () => {
  it.each([
    ["Q", ""],
    ["BIUwNmD2AEDukCcwBMg", "Hello world"],
    ["MIQwngZg9gTgpkA", "Cayfore"],
    [legacy.encoded, legacy.json],
  ])("retains compatibility with stored compressed fixture %s", (encoded, expected) => {
    expect(decompressShare(encoded, expected.length)).toBe(expected);
  });

  it("retains the legacy conversion of spaces to plus signs", () => {
    expect(legacy.encoded).toContain("+");
    expect(decompressShare(legacy.encoded.replaceAll("+", " "), legacy.json.length)).toBe(legacy.json);
  });

  it.each(["", "a", "\u0000", "\uffff", "😀", "\ud800", "\udc00", "a😀\ud800\udc00z", "a".repeat(4096)])(
    "counts exact output limits in UTF-16 code units for %j",
    (value) => {
      const encoded = compressToEncodedURIComponent(value);
      expect(decompressShare(encoded, value.length)).toBe(value);
      if (value.length) expect(decompressShare(encoded, value.length - 1)).toBeNull();
    },
  );

  it("matches the upstream codec for arbitrary UTF-16 including lone surrogates", () => {
    fc.assert(
      fc.property(utf16, (value) => {
        const encoded = compressToEncodedURIComponent(value);
        expect(decompressShare(encoded, value.length)).toBe(decompressFromEncodedURIComponent(encoded));
        if (value.length) expect(decompressShare(encoded, value.length - 1)).toBeNull();
      }),
      parameters,
    );
  });

  it("matches the upstream codec for Unicode text within a varying output cap", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 160 }), fc.nat({ max: 500 }), (value, max) => {
        const encoded = compressToEncodedURIComponent(value);
        expect(decompressShare(encoded, max)).toBe(value.length <= max ? value : null);
      }),
      parameters,
    );
  });

  it("decodes newly created portfolios without changing saved forecast values", () => {
    fc.assert(
      fc.property(fc.constantFrom("aws", "azure", "gcp"), utf16, (cloud, name) => {
        const portfolio = { ...blankPortfolio(cloud), name: `F${name.slice(0, 60)}X` };
        const json = JSON.stringify(portfolio);
        expect(decompressShare(encodePortfolio(portfolio), json.length)).toBe(json);
      }),
      parameters,
    );
  });

  it("rejects streams truncated before the required end marker", () => {
    fc.assert(
      fc.property(utf16, fc.integer({ min: 2, max: 30 }), (value, removed) => {
        const encoded = compressToEncodedURIComponent(value);
        // Two symbols remove more than the encoder's optional final padding.
        const truncated = encoded.slice(0, Math.max(0, encoded.length - removed));
        expect(decompressShare(truncated, value.length)).toBeNull();
      }),
      parameters,
    );
  });

  it("rejects invalid codes, invalid characters, and trailing data", () => {
    const invalidReference = stream([2, 0], [8, 97], [3, 7], [3, 2]);
    for (const encoded of ["y", "A", "$", "!", "QAA", "Q\u0000", "Q/", invalidReference]) {
      expect(decompressShare(encoded, 100)).toBeNull();
    }
  });

  it("requires valid input and finite nonnegative integer limits", () => {
    expect(decompressShare("", 0)).toBeNull();
    expect(decompressShare("Q", 0)).toBe("");
    for (const max of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(decompressShare("Q", max)).toBeNull();
    }
    expect(decompressShare(`Q${"A".repeat(SHARE_MAX_CHARS)}`, 10)).toBeNull();
  });

  it("stops a small compressed input at the configured one-million-character output limit", () => {
    const limit = 1_000_000;
    const exact = "a".repeat(limit);
    const oversized = compressToEncodedURIComponent(`${exact}a`);
    expect(oversized.length).toBeLessThan(3_000);
    expect(decompressShare(compressToEncodedURIComponent(exact), limit)).toBe(exact);
    expect(decompressShare(oversized, limit)).toBeNull();
    expect(decompressShare(oversized, limit + 1)).toBe(`${exact}a`);
  });
});
