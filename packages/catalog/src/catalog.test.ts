import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { productCatalog } from "./index.js";

describe("product catalog schema", () => {
  it("parses the checked-in catalog and is listed in the product docs", () => {
    expect(productCatalog.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(productCatalog.$schema).toBe("../packages/catalog/product-catalog.schema.json");
    expect(productCatalog.products.length).toBeGreaterThan(50);
    const docs = readFileSync(new URL("../../../docs/PRODUCTS.md", import.meta.url), "utf8");
    expect(docs).toContain(`Catalog version \`${productCatalog.version}\``);
    for (const product of productCatalog.products) {
      expect(docs).toContain(product.name);
    }
  });
});
