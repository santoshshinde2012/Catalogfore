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

test("RSS entities are decoded once in titles, links and GUIDs", () => {
  const items = parseRssItems(
    `<rss><channel><item><title>Pricing &lt;compute&gt; &amp; &quot;storage&quot; &#39;units&#39;</title><link>https://www.databricks.com/blog?product=compute&amp;edition=premium</link><guid isPermaLink="false">price&amp;unit</guid></item></channel></rss>`,
  );
  assert.deepEqual(items, [
    {
      title: `Pricing <compute> & "storage" 'units'`,
      link: "https://www.databricks.com/blog?product=compute&edition=premium",
      guid: "price&unit",
    },
  ]);
});

test("nested RSS escaping cannot become markup or a second decoded entity", () => {
  const encoded = "&amp;lt;script&amp;gt; &amp;quot;quoted&amp;quot; &amp;#39;unit&amp;#39; &amp;amp; &unknown;";
  const decodedOnce = "&lt;script&gt; &quot;quoted&quot; &#39;unit&#39; &amp; &unknown;";
  const items = parseRssItems(
    `<rss><channel><item><title>New pricing ${encoded}</title><link>https://www.databricks.com/blog?q=&amp;lt;script&amp;gt;</link><guid>${encoded}</guid></item></channel></rss>`,
  );
  assert.deepEqual(items, [
    {
      title: `New pricing ${decodedOnce}`,
      link: "https://www.databricks.com/blog?q=&lt;script&gt;",
      guid: decodedOnce,
    },
  ]);
  assert.equal(newBillingPosts(items, [decodedOnce]).length, 0);
});

test("RSS CDATA titles and missing GUID fallback retain their existing extraction behavior", () => {
  const items = parseRssItems(
    `<rss><channel><item><title><![CDATA[New pricing &amp; units]]></title><link>https://www.databricks.com/blog/pricing</link></item><item><title>  Pricing &amp; capacity  </title></item></channel></rss>`,
  );
  assert.deepEqual(items, [
    {
      title: "New pricing & units",
      link: "https://www.databricks.com/blog/pricing",
      guid: "https://www.databricks.com/blog/pricing",
    },
    { title: "Pricing & capacity", link: "", guid: "Pricing & capacity" },
  ]);
});

test("the checked-in catalog has the fields the watch needs", async () => {
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  assert.deepEqual(validateProductCatalogShape(catalog), []);
  for (const meter of AZURE_DBU_METERS) {
    assert.ok(catalog.knownAzureMeters.includes(meter.meter), meter.meter);
  }
});
