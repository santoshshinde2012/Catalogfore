import { describe, expect, it } from "vitest";
import { compressToEncodedURIComponent } from "lz-string";
import { parseCsv } from "./csv.js";
import {
  blankPortfolio,
  decodePortfolio,
  decodePortfolioResult,
  encodePortfolio,
  normalizePortfolio,
} from "./portfolio.js";
import { defaultPlan } from "./simple/plan-edits.js";
import { planFromUsage } from "./simple/project.js";
import {
  JSON_MAX_CHARS,
  SHARE_MAX_CHARS,
  UPLOAD_MAX_CHARS,
  UPLOAD_MAX_ROWS,
  UploadError,
  parseUntrustedJson,
} from "./untrusted.js";

describe("untrusted JSON", () => {
  it("accepts a plain object and rejects prototype keys", () => {
    expect(parseUntrustedJson('{"name":"Nightly"}')).toEqual({ name: "Nightly" });
    expect(() => parseUntrustedJson('{"__proto__":{"polluted":true}}')).toThrow(UploadError);
    expect(() => parseUntrustedJson('{"constructor":{"prototype":{"polluted":true}}}')).toThrow(UploadError);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rejects a file that is too large, too deep, or too wide", () => {
    expect(() => parseUntrustedJson("x".repeat(JSON_MAX_CHARS + 1))).toThrow(/too large/);
    let nested = "0";
    for (let depth = 0; depth < 45; depth += 1) nested = `{"a":${nested}}`;
    expect(() => parseUntrustedJson(nested)).toThrow(/nested/);
    expect(() => parseUntrustedJson(`[${"1,".repeat(10_001)}1]`)).toThrow(/too many/);
  });
});

describe("usage upload bounds", () => {
  it("ignores a prototype column and keeps the quantity", () => {
    const rows = parseCsv("__proto__,usage_quantity\npwned,3\n");
    expect(rows[0]?.usage_quantity).toBe("3");
    expect(({} as { pwned?: string }).pwned).toBeUndefined();
  });

  it("refuses a file that is too large or has too many rows", () => {
    expect(() => parseCsv("x".repeat(UPLOAD_MAX_CHARS + 1))).toThrow(UploadError);
    const header = "sku_name,usage_quantity\n";
    const body = "JOBS_COMPUTE,1\n".repeat(UPLOAD_MAX_ROWS + 1);
    expect(() => parseCsv(header + body)).toThrow(/too many/);
    const loaded = planFromUsage(defaultPlan(), "x".repeat(UPLOAD_MAX_CHARS + 1));
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toMatch(/too large/);
  });
});

describe("share links", () => {
  it("rejects a truncated compressed payload without throwing from either decoder", () => {
    expect(decodePortfolio("y")).toBeNull();
    expect(decodePortfolioResult("y").ok).toBe(false);
  });

  it("round-trips a portfolio and drops a link that is not plain data", () => {
    const portfolio = blankPortfolio("aws");
    portfolio.name = "Nightly";
    const restored = decodePortfolio(encodePortfolio(portfolio));
    expect(restored?.name).toBe("Nightly");
    expect(decodePortfolio("x".repeat(SHARE_MAX_CHARS + 1))).toBeNull();
    expect(decodePortfolio(compressToEncodedURIComponent('{"__proto__":{"polluted":true}}'))).toBeNull();
    expect(normalizePortfolio(parseUntrustedJson('{"name":"Ok"}')).name).toBe("Ok");
  });
});
