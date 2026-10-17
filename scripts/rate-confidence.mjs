import { readFile, writeFile } from "node:fs/promises";

const SCORE = { measured: 92, cited: 78, secondary: 55, unpublished: 8 };

/**
 * Confidence for one region-and-SKU cell.
 * Exact first-party regional meters are measured. Unscoped first-party bases remain
 * reference inputs; applying a region factor is a planning proxy.
 */
export function cellScore({
  cloud,
  region,
  hasMeter,
  hasFirstPartyRate = false,
  hasFirstPartyBase = false,
  hasConflict = false,
  reference,
}) {
  if (hasConflict) return { score: 0, band: "conflict" };
  if ((cloud === "azure" && hasMeter) || hasFirstPartyRate) return { score: 92, band: "measured" };
  if (region === reference && hasFirstPartyBase) return { score: 78, band: "cited" };
  if (region === reference) return { score: 60, band: "secondary" };
  return { score: 35, band: "proxy" };
}

export async function buildRateConfidence() {
  const catalog = JSON.parse(await readFile(new URL("../data/product-catalog.json", import.meta.url), "utf8"));
  const sku = JSON.parse(await readFile(new URL("../data/sku-rates.json", import.meta.url), "utf8"));
  const meters = JSON.parse(await readFile(new URL("../data/azure-dbu-meters.json", import.meta.url), "utf8"));
  const official = JSON.parse(await readFile(new URL("../data/databricks-dbu-rates.json", import.meta.url), "utf8"));
  const officialKeys = new Set(official.rates.map((row) => `${row.cloud}|${row.region}|${row.tier}|${row.sku}`));
  const conflicts = new Set(
    official.issues
      .filter((row) => row.status === "conflict")
      .map((row) => `${row.cloud}|${row.region}|${row.tier}|${row.sku}`),
  );
  const meterKeys = new Set(meters.meters.map((meter) => `${meter.region}|${meter.sku}`));
  const reference = Object.fromEntries(
    sku.regions.filter((region) => region.source === "reference").map((region) => [region.cloud, region.id]),
  );
  const skus = Object.keys(sku.rates.aws.premium);
  const tiers = ["premium", "enterprise"];
  const distribution = { measured: 0, cited: 0, secondary: 0, proxy: 0, conflict: 0, total: 0 };
  const cells = [];
  for (const region of sku.regions) {
    for (const tier of tiers) {
      for (const id of skus) {
        const scored = cellScore({
          cloud: region.cloud,
          region: region.id,
          hasMeter: meterKeys.has(`${region.id}|${id}`),
          hasConflict: conflicts.has(`${region.cloud}|${region.id}|${tier}|${id}`),
          hasFirstPartyRate: officialKeys.has(`${region.cloud}|${region.id}|${tier}|${id}`),
          hasFirstPartyBase:
            officialKeys.has(`${region.cloud}|null|${tier}|${id}`) ||
            officialKeys.has(`${region.cloud}|${reference[region.cloud]}|${tier}|${id}`),
          reference: reference[region.cloud],
        });
        distribution[scored.band] += 1;
        distribution.total += 1;
        cells.push({ cloud: region.cloud, region: region.id, tier, sku: id, ...scored });
      }
    }
  }
  const products = Object.fromEntries(
    catalog.products.map((product) => [
      product.id,
      { score: product.confidenceScore, band: product.confidence, expected: SCORE[product.confidence] },
    ]),
  );
  return {
    version: sku.version,
    rubric: {
      measured:
        "90–100. An exact regional Azure Retail Prices meter or a validated Databricks price-card/calculator USD/DBU row.",
      conflict: "0. Unreconciled first-party values for the same price key; the qualified quote is withheld.",
      cited: "70–89. A first-party number in the docs.",
      secondary: "40–69. A bundled secondary compilation without a matching captured first-party rate.",
      proxy: "20–39. A real rate for a different SKU or region, scaled. Lakehouse Real-Time factors are this band.",
      unpublished: "0–19. No dollar rate is stored. The zero is not a guess.",
    },
    skuRatesVersion: sku.version,
    productCatalogVersion: catalog.version,
    products,
    distribution,
    cells,
  };
}

export async function writeRateConfidence() {
  const report = await buildRateConfidence();
  await writeFile(new URL("../data/rate-confidence.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  return report;
}

if ((process.argv[1] ?? "").endsWith("rate-confidence.mjs")) {
  const report = await writeRateConfidence();
  console.log(JSON.stringify(report.distribution));
}
