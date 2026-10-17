import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { publishedLabel, renderProductsMarkdown } from "./products-doc.mjs";

test("the product doc is generated from the catalog", async () => {
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  const markdown = renderProductsMarkdown(catalog, "## What is not a separate dollar rate\n\n- Kept.");
  assert.equal(publishedLabel("distinct"), "Yes");
  assert.equal(publishedLabel("reused_sku"), "No distinct rate");
  assert.equal(publishedLabel("unpublished"), "No");
  assert.match(markdown, new RegExp(`Catalog version \`${catalog.version}\``));
  for (const product of catalog.products) {
    const name = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(markdown, new RegExp(name));
  }
  assert.match(markdown, /What is not a separate dollar rate/);
});
