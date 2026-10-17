import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildRateConfidence, cellScore } from "./rate-confidence.mjs";

test("reference cells are secondary and other regions are the proxy", () => {
  assert.deepEqual(cellScore({ cloud: "aws", region: "us-east-1", hasMeter: false, reference: "us-east-1" }), {
    score: 60,
    band: "secondary",
  });
  assert.equal(cellScore({ cloud: "aws", region: "sa-east-1", hasMeter: false, reference: "us-east-1" }).band, "proxy");
  assert.equal(cellScore({ cloud: "azure", region: "eastus", hasMeter: true, reference: "eastus" }).band, "measured");
});

test("stored confidence matches the catalog and the bands sum", async () => {
  const report = await buildRateConfidence();
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  const sku = JSON.parse(await readFile(new URL("../data/sku-rates.json", import.meta.url), "utf8"));
  assert.equal(report.skuRatesVersion, sku.version);
  assert.equal(report.version, sku.version);
  assert.equal(report.productCatalogVersion, catalog.version);
  assert.equal(
    report.distribution.measured + report.distribution.secondary + report.distribution.proxy,
    report.distribution.total,
  );
  assert.equal(report.cells.length, report.distribution.total);
  for (const product of catalog.products) {
    assert.equal(report.products[product.id].score, product.confidenceScore);
    assert.equal(report.products[product.id].expected, product.confidenceScore);
  }
  const stored = JSON.parse(await readFile(new URL("../data/rate-confidence.json", import.meta.url), "utf8"));
  assert.equal(stored.version, report.version);
  assert.equal(stored.skuRatesVersion, report.skuRatesVersion);
  assert.equal(stored.productCatalogVersion, report.productCatalogVersion);
  assert.deepEqual(stored.distribution, report.distribution);
});
