import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  gcpMachineHour,
  pickAzureDbuMeters,
  pickAzureLinuxHour,
  pickAzureSpotHour,
  spotHourFromSavings,
} from "./parse-prices.mjs";
import { validateCatalog } from "./validate-catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);
const SPOT_ADVISOR = "https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json";
const DATABRICKS_PROBES = [
  "https://www.databricks.com/en-pricing-assets/page-data/app-data.json",
  "https://www.databricks.com/page-data/product/pricing/page-data.json",
];

async function readJson(name) {
  return JSON.parse(await readFile(path.join(root, name), "utf8"));
}

async function fetchText(url, attempt = 0) {
  const response = await fetch(url, { headers: { "user-agent": "cayfore-price-refresh" } });
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
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

async function fetchAzureItems(filter) {
  let url = `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${encodeURIComponent(filter)}`;
  const items = [];
  for (let page = 0; page < 8 && url; page += 1) {
    const payload = await fetchJson(url);
    items.push(...(payload.Items ?? []));
    url = payload.NextPageLink || "";
  }
  return items;
}

async function azureRegion(region, instanceIds) {
  const summary = [];
  const prices = [];
  for (const instanceId of instanceIds) {
    const filter = `armRegionName eq '${region}' and armSkuName eq '${instanceId}' and priceType eq 'Consumption'`;
    try {
      const items = await fetchAzureItems(filter);
      const onDemand = pickAzureLinuxHour(items, instanceId);
      if (!onDemand) {
        summary.push(`azure ${region} ${instanceId}: no linux meter`);
        continue;
      }
      const spot = pickAzureSpotHour(items, instanceId);
      prices.push({
        cloud: "azure",
        region,
        instanceId,
        onDemandHourly: onDemand.onDemandHourly,
        ...(spot ? { spotHourly: spot.spotHourly } : {}),
        source: "azure-retail-prices",
        asOf: today,
      });
    } catch (error) {
      summary.push(`azure ${region} ${instanceId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  let meters = [];
  try {
    const filter = `serviceName eq 'Azure Databricks' and armRegionName eq '${region}' and priceType eq 'Consumption'`;
    const items = await fetchAzureItems(filter);
    meters = pickAzureDbuMeters(items).map((row) => ({ ...row, region }));
    summary.push(`azure ${region} meters: ${meters.length}`);
  } catch (error) {
    summary.push(`azure ${region} meters: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { region, prices, meters, summary };
}

async function streamAws(region, instanceIds) {
  const url = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${region}/index.csv`;
  const controller = new AbortController();
  const response = await fetch(url, { headers: { "user-agent": "cayfore-price-refresh" }, signal: controller.signal });
  if (!response.ok || !response.body) throw new Error(`${response.status} ${url}`);
  const wanted = new Set(instanceIds);
  const found = new Map();
  const decoder = new TextDecoder();
  let buffer = "";
  let header = null;
  let index = null;
  try {
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!header) {
          if (line.startsWith('"SKU"')) {
            header = splitCsvLine(line);
            index = {
              term: header.indexOf("TermType"),
              unit: header.indexOf("Unit"),
              price: header.indexOf("PricePerUnit"),
              instance: header.indexOf("Instance Type"),
              tenancy: header.indexOf("Tenancy"),
              os: header.indexOf("Operating System"),
              capacity: header.indexOf("CapacityStatus"),
              preinstalled: header.indexOf("Pre Installed S/W"),
            };
          }
          continue;
        }
        if (!wanted.size) continue;
        const hit = [...wanted].find((id) => line.includes(`"${id}"`));
        if (!hit) continue;
        const row = splitCsvLine(line);
        if (row[index.term] !== "OnDemand" || row[index.unit] !== "Hrs") continue;
        if (row[index.tenancy] !== "Shared" || row[index.os] !== "Linux") continue;
        if (row[index.capacity] !== "Used") continue;
        if (index.preinstalled >= 0 && row[index.preinstalled] && row[index.preinstalled] !== "NA") continue;
        const instanceId = row[index.instance];
        if (!wanted.has(instanceId)) continue;
        const hourly = Number(row[index.price]);
        if (!Number.isFinite(hourly) || hourly <= 0) continue;
        const current = found.get(instanceId);
        if (current == null || hourly < current) found.set(instanceId, hourly);
        if (found.size === wanted.size) controller.abort();
      }
    }
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "AbortError") throw error;
  }
  return [...found.entries()].map(([instanceId, onDemandHourly]) => ({ instanceId, onDemandHourly }));
}

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells;
}

async function spotSavings() {
  const payload = await fetchJson(SPOT_ADVISOR);
  const regions = payload.spot_advisor ?? {};
  const table = new Map();
  for (const [region, systems] of Object.entries(regions)) {
    const linux = systems.Linux ?? {};
    for (const [instanceId, row] of Object.entries(linux)) {
      if (typeof row?.s === "number") table.set(`${region}:${instanceId}`, row.s);
    }
  }
  return table;
}

async function gcpPrices(regions, instanceIds, apiKey) {
  if (!apiKey) return { skipped: true, rows: [] };
  const service = "6F81-5844-456A";
  const rows = [];
  let pageToken = "";
  const skus = [];
  do {
    const url = new URL(`https://cloudbilling.googleapis.com/v1/services/${service}/skus`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "5000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await fetchJson(url);
    skus.push(...(payload.skus ?? []));
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  const specs = {
    "n2-standard-4": { family: "N2", cores: 4, memory: 16 },
    "n2-standard-8": { family: "N2", cores: 8, memory: 32 },
    "n1-standard-4": { family: "N1", cores: 4, memory: 15 },
    "n1-standard-8": { family: "N1", cores: 8, memory: 30 },
    "n2-highmem-4": { family: "N2", cores: 4, memory: 32 },
    "c2-standard-8": { family: "C2", cores: 8, memory: 32 },
  };
  for (const region of regions) {
    for (const instanceId of instanceIds) {
      const spec = specs[instanceId];
      if (!spec) continue;
      const onDemandHourly = gcpMachineHour(skus, region, spec);
      if (onDemandHourly == null) continue;
      rows.push({
        cloud: "gcp",
        region,
        instanceId,
        onDemandHourly,
        source: "gcp-billing-catalog",
        asOf: today,
      });
    }
  }
  return { skipped: false, rows };
}

async function probeDatabricks() {
  const checks = [];
  for (const url of DATABRICKS_PROBES) {
    try {
      const text = await fetchText(url);
      const useful = /dbu_rate|usdPerDbu|instanceType/i.test(text) && text.length > 200;
      checks.push({ url, status: useful ? "prices" : "no-prices", bytes: text.length });
    } catch (error) {
      checks.push({ url, status: error instanceof Error ? error.message : String(error) });
    }
  }
  return {
    checkedOn: today,
    foundPublicJson: checks.some((check) => check.status === "prices"),
    checks,
    note: "Databricks pricing pages are a client bundle. These probes look for a JSON document of rates. They do not scrape the bundle. No public rate JSON means the curated table stays.",
  };
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
    const nextMeters = region.meters.length > 0 ? region.meters : prior;
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
