import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAwsOfferCsv, pickAzureLinuxHour } from "./parse-prices.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pricesPath = path.join(root, "data", "cloud-vm-prices.json");
const instancesPath = path.join(root, "data", "instances.json");

const today = new Date().toISOString().slice(0, 10);

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "databricks-cost-forecaster-refresh" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function azureHourly(armSkuName, region) {
  const filter = `armRegionName eq '${region}' and armSkuName eq '${armSkuName}' and priceType eq 'Consumption'`;
  const url = `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${encodeURIComponent(filter)}`;
  const payload = await fetchJson(url);
  return pickAzureLinuxHour(payload.Items, armSkuName);
}

async function awsRegionPrices(region, instanceIds) {
  const url = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${region}/index.csv`;
  const csv = await fetchText(url);
  return parseAwsOfferCsv(csv, instanceIds);
}

function upsert(prices, row) {
  const index = prices.findIndex(
    (item) => item.cloud === row.cloud && item.region === row.region && item.instanceId === row.instanceId,
  );
  if (index >= 0) prices[index] = { ...prices[index], ...row };
  else prices.push(row);
}

async function main() {
  const catalog = JSON.parse(await readFile(pricesPath, "utf8"));
  const instances = JSON.parse(await readFile(instancesPath, "utf8"));
  const summary = [];
  const awsIds = instances.instances.filter((row) => row.cloud === "aws").map((row) => row.id);
  const azureIds = instances.instances.filter((row) => row.cloud === "azure").map((row) => row.id);
  const awsRegions = ["us-east-1"];
  const azureRegions = ["eastus"];

  for (const region of azureRegions) {
    for (const instanceId of azureIds) {
      try {
        const picked = await azureHourly(instanceId, region);
        if (!picked) {
          summary.push(`azure ${region} ${instanceId}: no linux meter`);
          continue;
        }
        upsert(catalog.prices, {
          cloud: "azure",
          region,
          instanceId,
          onDemandHourly: picked.onDemandHourly,
          source: "azure-retail-prices",
          asOf: today,
        });
        summary.push(`azure ${region} ${instanceId}: ${picked.onDemandHourly}`);
      } catch (error) {
        summary.push(`azure ${region} ${instanceId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (process.env.SKIP_AWS !== "1") {
    for (const region of awsRegions) {
      try {
        const rows = await awsRegionPrices(region, awsIds);
        for (const row of rows) {
          upsert(catalog.prices, {
            cloud: "aws",
            region,
            instanceId: row.instanceId,
            onDemandHourly: row.onDemandHourly,
            source: "aws-offer-file",
            asOf: today,
          });
        }
        summary.push(`aws ${region}: ${rows.length} instances`);
      } catch (error) {
        summary.push(`aws ${region}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  catalog.updatedOn = today;
  catalog.note =
    "On-demand hourly VM rates. Rows with source azure-retail-prices or aws-offer-file were written by scripts/refresh-prices.mjs. Other rows are curated seeds. GCP stays seeded unless GCP_BILLING_API_KEY is added later. DBU list rates are not touched.";
  await writeFile(pricesPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(summary.join("\n"));
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirect) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
