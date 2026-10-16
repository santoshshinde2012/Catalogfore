import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCoverage } from "./coverage-report.mjs";

test("coverage counts priced products and azure meter cells", async () => {
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  const sku = JSON.parse(await readFile(new URL("../data/sku-rates.json", import.meta.url), "utf8"));
  const meters = JSON.parse(await readFile(new URL("../data/azure-dbu-meters.json", import.meta.url), "utf8"));
  const summary = JSON.parse(await readFile(new URL("../data/coverage-summary.json", import.meta.url), "utf8"));
  const report = buildCoverage(catalog, sku, meters);
  assert.equal(report.products, catalog.products.length);
  assert.equal(report.pricedProducts + report.unpublishedProducts, report.products);
  assert.ok(report.productCoveragePercent > 50);
  assert.ok(report.azureRegions > 30);
  assert.equal(report.awsFactoredRegions, report.awsRegions);
  assert.equal(summary.assumption, report.assumption);
  assert.match(summary.assumption, /Catalog coverage/);
});
