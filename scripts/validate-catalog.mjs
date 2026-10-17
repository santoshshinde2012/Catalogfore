/** Schema and sanity checks for the checked-in price files. No network. */

const CLOUDS = new Set(["aws", "azure", "gcp"]);

export function validateCatalog({ sku, instances, prices, azureMeters }) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(sku?.version ?? ""))
    errors.push("sku-rates version must look like 2026-10-16.1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sku?.verifiedOn ?? "")) errors.push("sku-rates verifiedOn must be a date");
  if (!Array.isArray(sku?.regions) || sku.regions.length < 3) errors.push("sku-rates regions are missing");
  for (const region of sku?.regions ?? []) {
    if (!CLOUDS.has(region.cloud)) errors.push(`unknown cloud ${region.cloud}`);
    if (!(region.factor > 0.4 && region.factor < 3)) errors.push(`region factor out of range ${region.id}`);
  }
  for (const cloud of CLOUDS) {
    for (const tier of ["premium", "enterprise"]) {
      const rates = sku?.rates?.[cloud]?.[tier];
      if (!rates) {
        errors.push(`missing rates ${cloud} ${tier}`);
        continue;
      }
      for (const [skuId, rate] of Object.entries(rates)) {
        if (!(rate > 0 && rate < 5)) errors.push(`sku rate out of range ${cloud} ${tier} ${skuId}`);
      }
    }
  }

  const instanceKeys = new Set();
  for (const row of instances?.instances ?? []) {
    const key = `${row.cloud}:${row.id}`;
    if (instanceKeys.has(key)) errors.push(`duplicate instance ${key}`);
    instanceKeys.add(key);
    if (!CLOUDS.has(row.cloud)) errors.push(`instance cloud ${row.id}`);
    if (!(row.dbuPerHour >= 0.05 && row.dbuPerHour <= 40)) errors.push(`dbu rating out of range ${key}`);
  }

  const priceKeys = new Set();
  for (const row of prices?.prices ?? []) {
    const key = `${row.cloud}:${row.region}:${row.instanceId}`;
    if (priceKeys.has(key)) errors.push(`duplicate price ${key}`);
    priceKeys.add(key);
    if (!(row.onDemandHourly > 0 && row.onDemandHourly < 50)) errors.push(`vm price out of range ${key}`);
    if (row.spotHourly != null && !(row.spotHourly > 0 && row.spotHourly < row.onDemandHourly)) {
      errors.push(`spot price out of range ${key}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.asOf ?? "")) errors.push(`price asOf ${key}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prices?.updatedOn ?? "")) errors.push("vm file updatedOn");

  const meterKeys = new Set();
  for (const row of azureMeters?.meters ?? []) {
    const key = `${row.region}:${row.sku}`;
    if (meterKeys.has(key)) errors.push(`duplicate meter ${key}`);
    meterKeys.add(key);
    if (!(row.usdPerDbu > 0 && row.usdPerDbu < 5)) errors.push(`meter out of range ${key}`);
    if (row.asOf != null && (!/^\d{4}-\d{2}-\d{2}$/.test(row.asOf) || !row.meterId || !row.sourceUrl))
      errors.push(`meter observation metadata ${key}`);
    if (row.effectiveStartDate != null && !Number.isFinite(Date.parse(row.effectiveStartDate)))
      errors.push(`meter effective date ${key}`);
    if (row.sourceUrl) {
      try {
        const url = new URL(row.sourceUrl);
        if (
          url.protocol !== "https:" ||
          url.hostname !== "prices.azure.com" ||
          url.username ||
          url.password ||
          url.pathname !== "/api/retail/prices"
        )
          errors.push(`meter source URL ${key}`);
      } catch {
        errors.push(`meter source URL ${key}`);
      }
    }
  }
  if (azureMeters && !/^\d{4}-\d{2}-\d{2}$/.test(azureMeters.updatedOn ?? "")) {
    errors.push("azure meter updatedOn");
  }
  return errors;
}
