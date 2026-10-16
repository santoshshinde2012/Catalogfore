import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { productCatalog } from "./index.js";

describe("product catalog schema", () => {
  it("parses the checked-in catalog and is listed in the product docs", () => {
    expect(productCatalog.version).toBe("2026-10-16.4");
    expect(productCatalog.products.length).toBeGreaterThan(50);
    const docs = readFileSync(new URL("../../../docs/PRODUCTS.md", import.meta.url), "utf8");
    for (const product of productCatalog.products) {
      expect(docs).toContain(product.name);
    }
  });
});
