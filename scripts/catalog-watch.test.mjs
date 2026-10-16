import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  newBillingPosts,
  parseRssItems,
  staleProductIds,
  unknownMeterNames,
  validateProductCatalogShape,
} from "./catalog-watch.mjs";
import { AZURE_DBU_METERS } from "./parse-prices.mjs";

test("a manual citation older than 120 days is stale", () => {
  const products = [
    { id: "old", automation: "manual", source: { fetchedOn: "2026-01-01" } },
    { id: "fresh", automation: "manual", source: { fetchedOn: "2026-10-16" } },
    { id: "meter", automation: "azure-retail-prices", source: { fetchedOn: "2025-01-01" } },
  ];
  assert.deepEqual(staleProductIds(products, "2026-10-16"), ["old"]);
});

test("unknown Azure meters are names the catalog does not list", () => {
  const found = [
    "Premium Jobs Compute DBU",
    "Premium Photon DBU",
    "Premium Something New DBU",
    "Premium Something New DBU",
  ];
  assert.deepEqual(unknownMeterNames(found, ["Premium Jobs Compute DBU"]), ["Premium Something New DBU"]);
});

test("rss items keep billing titles that have not been seen", () => {
  const xml = `<rss><channel><item><title>New pricing for Lakebase</title><link>https://www.databricks.com/blog/a</link><guid>a</guid></item><item><title>Office party</title><link>https://www.databricks.com/blog/b</link><guid>b</guid></item></channel></rss>`;
  const items = parseRssItems(xml);
  assert.equal(items.length, 2);
  assert.deepEqual(
    newBillingPosts(items, []).map((item) => item.guid),
    ["a"],
  );
  assert.deepEqual(newBillingPosts(items, ["a"]), []);
});

test("the checked-in catalog has the fields the watch needs", async () => {
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  assert.deepEqual(validateProductCatalogShape(catalog), []);
  for (const meter of AZURE_DBU_METERS) {
    assert.ok(catalog.knownAzureMeters.includes(meter.meter), meter.meter);
  }
});
