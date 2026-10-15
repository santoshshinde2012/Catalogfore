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
      item.priceType === "Consumption" &&
      typeof item.unitPrice === "number" &&
      item.unitPrice > 0 &&
      String(item.unitOfMeasure ?? "").toLowerCase().includes("hour") &&
      !/windows/i.test(name) &&
      !/spot|low priority/i.test(name)
    );
  });
  matches.sort((a, b) => a.unitPrice - b.unitPrice);
  return matches[0] ? { onDemandHourly: matches[0].unitPrice, meterName: matches[0].meterName ?? "" } : null;
}
