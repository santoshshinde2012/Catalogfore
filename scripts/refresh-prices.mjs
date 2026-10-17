import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spotHourFromSavings } from "./parse-prices.mjs";
import { validateCatalog } from "./validate-catalog.mjs";
import { today } from "./refresh-http.mjs";
import { streamAws } from "./refresh-aws.mjs";
import { azureRegion, gcpPrices, probeDatabricks, spotSavings } from "./refresh-sources.mjs";
import { mergeAzureMeters } from "./azure-meter-provenance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function readJson(name) {
  return JSON.parse(await readFile(path.join(root, name), "utf8"));
}

function upsert(prices, row) {
  const index = prices.findIndex(
    (item) => item.cloud === row.cloud && item.region === row.region && item.instanceId === row.instanceId,
  );
  const previous = index >= 0 ? prices[index] : null;
  if (
    previous &&
    (row.onDemandHourly > previous.onDemandHourly * 5 || row.onDemandHourly < previous.onDemandHourly * 0.2)
  ) {
    return `rejected ${row.cloud} ${row.region} ${row.instanceId}: ${row.onDemandHourly} vs ${previous.onDemandHourly}`;
  }
  if (index >= 0) prices[index] = { ...previous, ...row };
  else prices.push(row);
  return null;
}

async function mapPool(items, limit, worker) {
  const results = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function main() {
  const sku = await readJson("data/sku-rates.json");
  const instances = await readJson("data/instances.json");
  const prices = await readJson("data/cloud-vm-prices.json");
  const previousMeters = await readJson("data/azure-dbu-meters.json").catch(() => ({ meters: [] }));
  const summary = [];
  const awsRegions = sku.regions.filter((region) => region.cloud === "aws").map((region) => region.id);
  const azureRegions = sku.regions.filter((region) => region.cloud === "azure").map((region) => region.id);
  const gcpRegions = sku.regions.filter((region) => region.cloud === "gcp").map((region) => region.id);
  const ids = (cloud) => instances.instances.filter((row) => row.cloud === cloud).map((row) => row.id);

  const azure = await mapPool(azureRegions, 3, (region) => azureRegion(region, ids("azure")));
  const meters = [];
  for (const region of azure) {
    summary.push(...region.summary);
    const prior = (previousMeters.meters ?? []).filter((row) => row.region === region.region);
    const nextMeters = mergeAzureMeters(prior, region.meters, region.region);
    if (!region.meters.length && prior.length) {
      summary.push(`azure ${region.region} meters: kept ${prior.length} previous rows`);
    }
    meters.push(...nextMeters);
    for (const row of region.prices) {
      const rejected = upsert(prices.prices, row);
      if (rejected) summary.push(rejected);
    }
  }

  let spot = new Map();
  try {
    spot = await spotSavings();
  } catch (error) {
    summary.push(`spot advisor: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (process.env.SKIP_AWS !== "1") {
    await mapPool(awsRegions, 2, async (region) => {
      try {
        const rows = await streamAws(region, ids("aws"));
        for (const row of rows) {
          const savings = spot.get(`${region}:${row.instanceId}`);
          const spotHourly = spotHourFromSavings(row.onDemandHourly, savings);
          const rejected = upsert(prices.prices, {
            cloud: "aws",
            region,
            instanceId: row.instanceId,
            onDemandHourly: row.onDemandHourly,
            ...(spotHourly ? { spotHourly } : {}),
            source: "aws-offer-file",
            asOf: today,
          });
          if (rejected) summary.push(rejected);
        }
        summary.push(`aws ${region}: ${rows.length} instances`);
      } catch (error) {
        summary.push(`aws ${region}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  try {
    const gcp = await gcpPrices(gcpRegions, ids("gcp"), process.env.GCP_BILLING_API_KEY ?? "");
    if (gcp.skipped) summary.push("gcp: skipped, GCP_BILLING_API_KEY is not set");
    else {
      for (const row of gcp.rows) {
        const rejected = upsert(prices.prices, row);
        if (rejected) summary.push(rejected);
      }
      summary.push(`gcp: ${gcp.rows.length} instances`);
    }
  } catch (error) {
    summary.push(`gcp: ${error instanceof Error ? error.message : String(error)}`);
  }

  prices.updatedOn = today;
  prices.version = `${today}.2`;
  prices.note =
    "On-demand hourly VM rates for every Databricks region in data/sku-rates.json. AWS rows come from the public EC2 offer file. Azure rows come from the Retail Prices API. spotHourly, when present, is the Spot Instance advisor or the Azure Spot meter, not a live quote. GCP stays seeded unless GCP_BILLING_API_KEY is set.";

  const azureFile = {
    version: `${today}.2`,
    updatedOn: today,
    source: "azure-retail-prices",
    note: "Premium Azure Databricks consumption meters. Enterprise uses the same meters. A SKU missing from a region still uses the curated US East rate times the region factor.",
    meters: meters.sort((a, b) => a.region.localeCompare(b.region) || a.sku.localeCompare(b.sku)),
  };

  summary.push("instance dbu ratings: left unchanged (cited table, not refreshed)");

  const probe = await probeDatabricks();
  summary.push(`databricks json: ${probe.foundPublicJson ? "found" : "not found"}`);

  const errors = validateCatalog({ sku, instances, prices, azureMeters: azureFile });
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  await writeFile(path.join(root, "data/cloud-vm-prices.json"), `${JSON.stringify(prices, null, 2)}\n`);
  await writeFile(path.join(root, "data/azure-dbu-meters.json"), `${JSON.stringify(azureFile, null, 2)}\n`);
  await writeFile(path.join(root, "data/pricing-probe.json"), `${JSON.stringify(probe, null, 2)}\n`);
  console.log(summary.join("\n"));
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirect) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
