import assert from "node:assert/strict";
import test from "node:test";
import { mergeAzureMeters } from "./azure-meter-provenance.mjs";
import { fetchAzureItems } from "./refresh-sources.mjs";

test("a partial Azure refresh preserves old observations and unknown legacy dates", () => {
  const previous = [
    { region: "eastus", sku: "jobs_classic", usdPerDbu: 0.3, asOf: "2026-10-10" },
    { region: "eastus", sku: "sql_pro", usdPerDbu: 0.55, asOf: "2026-10-09" },
    { region: "eastus", sku: "sql_classic", usdPerDbu: 0.22 },
    { region: "westus", sku: "jobs_classic", usdPerDbu: 0.3, asOf: "2026-10-08" },
  ];
  const observed = [{ region: "eastus", sku: "jobs_classic", usdPerDbu: 0.31, asOf: "2026-10-17" }];
  const merged = mergeAzureMeters(previous, observed, "eastus");
  assert.deepEqual(merged, [observed[0], previous[2], previous[1]]);
  assert.deepEqual(
    mergeAzureMeters(previous, [], "eastus"),
    previous.slice(0, 3).sort((a, b) => a.sku.localeCompare(b.sku)),
  );
  assert.equal(previous[0].asOf, "2026-10-10");
  assert.throws(() => mergeAzureMeters(previous, [{ ...observed[0], asOf: null }], "eastus"), /observation date/);
  assert.throws(() => mergeAzureMeters(previous, observed, "westus"), /region/);
});

test("Azure pagination follows every page and rejects a truncated response", async () => {
  let requests = 0;
  const rows = await fetchAzureItems("serviceName eq 'Azure Databricks'", async () => {
    requests += 1;
    return { Items: [{ page: requests }], NextPageLink: requests < 2 ? "https://prices.azure.com/next" : null };
  });
  assert.deepEqual(rows, [{ page: 1 }, { page: 2 }]);
  await assert.rejects(
    fetchAzureItems("serviceName eq 'Azure Databricks'", async () => ({
      Items: [],
      NextPageLink: "https://prices.azure.com/next",
    })),
    /refusing a partial/,
  );
});
