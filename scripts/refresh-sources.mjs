import { gcpMachineHour, pickAzureDbuMeters, pickAzureLinuxHour, pickAzureSpotHour } from "./parse-prices.mjs";
import { DATABRICKS_PROBES, SPOT_ADVISOR, fetchJson, fetchText, today } from "./refresh-http.mjs";

export async function fetchAzureItems(filter) {
  let url = `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${encodeURIComponent(filter)}`;
  const items = [];
  for (let page = 0; page < 8 && url; page += 1) {
    const payload = await fetchJson(url);
    items.push(...(payload.Items ?? []));
    url = payload.NextPageLink || "";
  }
  return items;
}

export async function azureRegion(region, instanceIds) {
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

export async function spotSavings() {
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

export async function gcpPrices(regions, instanceIds, apiKey) {
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

export async function probeDatabricks() {
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
