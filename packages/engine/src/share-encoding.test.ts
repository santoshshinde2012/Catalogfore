import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import {
  blankPortfolio,
  decodePortfolio,
  encodePortfolio,
  normalizePortfolio,
  parseSavedForecast,
} from "./portfolio.js";
import { JSON_MAX_CHARS, SHARE_MAX_CHARS, UploadError } from "./untrusted.js";

function largePortfolio(count: number, extraInputs = false) {
  let seed = 0x1badf00d;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const text = (length: number) =>
    Array.from({ length }, () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return alphabet[(seed >>> 0) % alphabet.length];
    }).join("");
  return normalizePortfolio({
    ...blankPortfolio(),
    workloads: Array.from({ length: count }, (_, index) => ({
      id: `storage-${index}`,
      name: `Storage ${index}`,
      kind: "storage",
      gbMonth: 100,
      managed: true,
      inputs: {
        sourceSku: text(512),
        ...(extraInputs
          ? Object.fromEntries(Array.from({ length: 20 }, (_, field) => [`field${field}`, "x".repeat(40)]))
          : {}),
      },
    })),
  });
}

describe("share encoding limits", () => {
  it("keeps a large supported forecast reopenable", () => {
    const portfolio = largePortfolio(50);
    const encoded = encodePortfolio(portfolio);
    expect(encoded.length).toBeLessThan(SHARE_MAX_CHARS);
    expect(decodePortfolio(encoded)).toEqual(portfolio);
  });

  it("rejects valid forecasts exceeding the decoded JSON limit before compressing", () => {
    const portfolio = largePortfolio(1000, true);
    expect(parseSavedForecast(portfolio).ok).toBe(true);
    expect(JSON.stringify(portfolio).length).toBeGreaterThan(JSON_MAX_CHARS);
    expect(() => encodePortfolio(portfolio)).toThrow(UploadError);
    expect(() => encodePortfolio(portfolio)).toThrow(/Export JSON/);
  });

  it("rejects a compressed link above the decoder limit even when its JSON fits", () => {
    const portfolio = largePortfolio(300);
    const json = JSON.stringify(portfolio);
    expect(parseSavedForecast(portfolio).ok).toBe(true);
    expect(json.length).toBeLessThan(JSON_MAX_CHARS);
    expect(compressToEncodedURIComponent(json).length).toBeGreaterThan(SHARE_MAX_CHARS);
    expect(() => encodePortfolio(portfolio)).toThrow(/too large for a share link/);
  });
});
