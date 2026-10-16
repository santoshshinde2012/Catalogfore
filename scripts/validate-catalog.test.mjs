import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCatalog } from "./validate-catalog.mjs";

test("checked-in catalogs pass schema and sanity checks", async () => {
  const [sku, instances, prices, azureMeters] = await Promise.all([
    readJson("data/sku-rates.json"),
    readJson("data/instances.json"),
    readJson("data/cloud-vm-prices.json"),
    readJson("data/azure-dbu-meters.json"),
  ]);
  assert.deepEqual(validateCatalog({ sku, instances, prices, azureMeters }), []);
});

test("instance ratings are a cited table and are not downloaded", async () => {
  const instances = await readJson("data/instances.json");
  const script = await readFile(new URL("./refresh-prices.mjs", import.meta.url), "utf8");
  assert.equal(/lakemeter/i.test(script), false);
  assert.equal(/lakemeter/i.test(JSON.stringify(instances)), false);
  assert.match(instances.note, /azure\.microsoft\.com\/en-us\/pricing\/details\/databricks/);
  assert.match(script, /left unchanged/);
});

test("a zero vm price and a duplicate meter fail", async () => {
  const [sku, instances, prices, azureMeters] = await Promise.all([
    readJson("data/sku-rates.json"),
    readJson("data/instances.json"),
    readJson("data/cloud-vm-prices.json"),
    readJson("data/azure-dbu-meters.json"),
  ]);
  const brokenPrices = {
    ...prices,
    prices: [{ ...prices.prices[0], onDemandHourly: 0 }],
  };
  const brokenMeters = {
    ...azureMeters,
    meters: [azureMeters.meters[0], { ...azureMeters.meters[0] }],
  };
  const errors = validateCatalog({ sku, instances, prices: brokenPrices, azureMeters: brokenMeters });
  assert.ok(errors.some((error) => error.includes("vm price")));
  assert.ok(errors.some((error) => error.includes("duplicate meter")));
});

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}
