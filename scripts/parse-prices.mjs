/** Pure helpers for the cloud price refresh. Tested without the network. */

export function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
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
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.length)) rows.push(row);
  }
  return rows;
}

/**
 * Pull Linux shared on-demand hourly rates from an AWS offer CSV.
 * The file's first rows are metadata; the header is the row whose first cell is SKU.
 */
export function parseAwsOfferCsv(text, instanceIds) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === "SKU");
  if (headerIndex < 0) return [];
  const header = rows[headerIndex];
  const column = (name) => header.indexOf(name);
  const idx = {
    term: column("TermType"),
    unit: column("Unit"),
    price: column("PricePerUnit"),
    instance: column("Instance Type"),
    tenancy: column("Tenancy"),
    os: column("Operating System"),
    capacity: column("CapacityStatus"),
    preinstalled: column("Pre Installed S/W"),
  };
  const wanted = new Set(instanceIds);
  const found = new Map();
  for (const row of rows.slice(headerIndex + 1)) {
    if (row[idx.term] !== "OnDemand") continue;
    if (row[idx.unit] !== "Hrs") continue;
    if (row[idx.tenancy] !== "Shared") continue;
    if (row[idx.os] !== "Linux") continue;
    if (row[idx.capacity] !== "Used") continue;
    if (idx.preinstalled >= 0 && row[idx.preinstalled] && row[idx.preinstalled] !== "NA") continue;
    const instanceId = row[idx.instance];
    if (!wanted.has(instanceId)) continue;
    const hourly = Number(row[idx.price]);
    if (!Number.isFinite(hourly) || hourly <= 0) continue;
    const current = found.get(instanceId);
    if (current == null || hourly < current) found.set(instanceId, hourly);
  }
  return [...found.entries()].map(([instanceId, onDemandHourly]) => ({ instanceId, onDemandHourly }));
}

/** Pick the Linux pay-as-you-go meter from an Azure Retail Prices payload. */
export function pickAzureLinuxHour(items, armSkuName) {
  const matches = (items ?? []).filter((item) => {
    const name = `${item.productName ?? ""} ${item.skuName ?? ""} ${item.meterName ?? ""}`;
    return (
      item.armSkuName === armSkuName &&
      (item.priceType == null || item.priceType === "Consumption") &&
      typeof item.unitPrice === "number" &&
      item.unitPrice > 0 &&
      String(item.unitOfMeasure ?? "")
        .toLowerCase()
        .includes("hour") &&
      !/windows/i.test(name) &&
      !/spot|low priority/i.test(name)
    );
  });
  matches.sort((a, b) => a.unitPrice - b.unitPrice);
  return matches[0] ? { onDemandHourly: matches[0].unitPrice, meterName: matches[0].meterName ?? "" } : null;
}

/** Linux spot hourly rate. Azure publishes it as a Consumption meter with Spot in the name. */
export function pickAzureSpotHour(items, armSkuName) {
  const matches = (items ?? []).filter((item) => {
    const name = `${item.productName ?? ""} ${item.skuName ?? ""} ${item.meterName ?? ""}`;
    return (
      item.armSkuName === armSkuName &&
      (item.priceType == null || item.priceType === "Consumption") &&
      typeof item.unitPrice === "number" &&
      item.unitPrice > 0 &&
      String(item.unitOfMeasure ?? "")
        .toLowerCase()
        .includes("hour") &&
      /spot/i.test(name) &&
      !/windows/i.test(name)
    );
  });
  matches.sort((a, b) => a.unitPrice - b.unitPrice);
  return matches[0] ? { spotHourly: matches[0].unitPrice, meterName: matches[0].meterName ?? "" } : null;
}

/** Premium meter name to catalog SKU ids. Photon, trial, and POC meters are not listed. */
export const AZURE_DBU_METERS = [
  { meter: "Premium Jobs Compute DBU", skus: ["jobs_classic"] },
  { meter: "Premium All-purpose Compute DBU", skus: ["all_purpose_classic"] },
  { meter: "Premium SQL Analytics DBU", skus: ["sql_classic"] },
  { meter: "Premium SQL Compute Pro DBU", skus: ["sql_pro"] },
  { meter: "Premium Serverless SQL DBU", skus: ["sql_serverless"] },
  { meter: "Premium Automated Serverless Compute DBU", skus: ["jobs_serverless", "dlt_serverless"] },
  { meter: "Premium Interactive Serverless Compute DBU", skus: ["all_purpose_serverless", "apps"] },
  { meter: "Premium Core Compute Delta Live Tables DBU", skus: ["dlt_core"] },
  { meter: "Premium Pro Compute Delta Live Tables DBU", skus: ["dlt_pro"] },
  { meter: "Premium Advanced Compute Delta Live Tables DBU", skus: ["dlt_advanced"] },
  { meter: "Premium Model Training DBU", skus: ["model_training"] },
  { meter: "Premium Serverless Realtime Inferencing DBU", skus: ["model_serving"] },
];

export function pickAzureDbuMeters(items) {
  const rows = [];
  for (const item of items ?? []) {
    if (item.priceType && item.priceType !== "Consumption") continue;
    if (!(item.unitPrice > 0)) continue;
    const name = String(item.meterName ?? "");
    if (/photon|free trial|poc /i.test(name)) continue;
    const spec = AZURE_DBU_METERS.find((row) => row.meter === name);
    if (!spec) continue;
    for (const sku of spec.skus) {
      rows.push({ sku, usdPerDbu: item.unitPrice, meterName: name });
    }
  }
  return rows;
}

/**
 * On-demand hourly price for a GCP machine: cores × family core SKU + memory × family RAM SKU.
 * `skus` is a Cloud Billing Catalog page. Missing either SKU returns null.
 */
export function gcpMachineHour(skus, region, spec) {
  const core = gcpSkuHour(skus, region, `${spec.family} Instance Core`);
  const ram = gcpSkuHour(skus, region, `${spec.family} Instance Ram`);
  if (core == null || ram == null) return null;
  return Math.round((spec.cores * core + spec.memory * ram) * 1e6) / 1e6;
}

function gcpSkuHour(skus, region, descriptionPrefix) {
  const sku = (skus ?? []).find(
    (item) =>
      String(item.description ?? "").startsWith(descriptionPrefix) &&
      Array.isArray(item.serviceRegions) &&
      item.serviceRegions.includes(region) &&
      item.category?.usageType === "OnDemand",
  );
  const rate = sku?.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice;
  if (!rate) return null;
  const hourly = Number(rate.units ?? 0) + Number(rate.nanos ?? 0) / 1e9;
  return hourly > 0 ? hourly : null;
}

/** Spot advisor `s` is the percent saved versus on-demand, not an hourly price. */
export function spotHourFromSavings(onDemandHourly, savingsPercent) {
  if (!(onDemandHourly > 0) || !Number.isFinite(savingsPercent)) return null;
  const fraction = savingsPercent / 100;
  if (fraction <= 0 || fraction >= 0.95) return null;
  return Math.round(onDemandHourly * (1 - fraction) * 1e6) / 1e6;
}
