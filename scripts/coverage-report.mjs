import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { writeProductsDoc } from "./products-doc.mjs";

const root = new URL("../", import.meta.url);

export function buildCoverage(catalog, sku, meters, published = { rates: [] }) {
  const products = catalog.products ?? [];
  const priced = products.filter((product) => product.listPrice !== "unpublished");
  const unpublished = products.filter((product) => product.listPrice === "unpublished");
  const productCoveragePercent = products.length ? Math.round((priced.length / products.length) * 1000) / 10 : 0;
  const regions = sku.regions ?? [];
  const azureRegions = regions.filter((region) => region.cloud === "azure");
  const awsRegions = regions.filter((region) => region.cloud === "aws");
  const gcpRegions = regions.filter((region) => region.cloud === "gcp");
  const meterRows = meters.meters ?? [];
  const meterSkus = [...new Set(meterRows.map((row) => row.sku))].sort();
  let cells = 0;
  let filled = 0;
  const byRegion = [];
  for (const region of azureRegions) {
    let regionFilled = 0;
    for (const id of meterSkus) {
      cells += 1;
      if (meterRows.some((row) => row.region === region.id && row.sku === id)) {
        filled += 1;
        regionFilled += 1;
      }
    }
    byRegion.push({
      region: region.id,
      percent: meterSkus.length ? Math.round((regionFilled / meterSkus.length) * 1000) / 10 : 0,
    });
  }
  const azureRegionSkuPercent = cells ? Math.round((filled / cells) * 1000) / 10 : 0;
  const factored = (list) => list.filter((region) => typeof region.factor === "number").length;
  const officialKeys = new Set(published.rates.map((row) => `${row.cloud}:${row.region}:${row.tier}:${row.sku}`));
  const officialRegionalCells = ["aws", "gcp"].map((cloud) => {
    let filled = 0;
    let cells = 0;
    for (const region of regions.filter((row) => row.cloud === cloud))
      for (const [tier, rates] of Object.entries(sku.rates[cloud]))
        for (const id of Object.keys(rates)) {
          cells += 1;
          if (officialKeys.has(`${cloud}:${region.id}:${tier}:${id}`)) filled += 1;
        }
    return { cloud, filled, cells };
  });
  const assumption = `Catalog coverage: ${priced.length} of ${products.length} products (${productCoveragePercent}%) have a stored rate or a priced underlying SKU. Azure meters fill ${azureRegionSkuPercent}% of mapped region-and-SKU cells across ${azureRegions.length} regions. AWS and GCP use validated first-party regional prices where captured; remaining reference bases, consumption assumptions, and regional proxies stay labeled. Stored-price coverage does not establish service availability.`;
  return {
    assumption,
    products: products.length,
    pricedProducts: priced.length,
    unpublishedProducts: unpublished.length,
    productCoveragePercent,
    unpublishedIds: unpublished.map((product) => product.id).sort(),
    azureRegionSkuPercent,
    azureRegions: azureRegions.length,
    azureMeterSkus: meterSkus.length,
    azureFilledCells: filled,
    azureCells: cells,
    awsRegions: awsRegions.length,
    awsFactoredRegions: factored(awsRegions),
    gcpRegions: gcpRegions.length,
    gcpFactoredRegions: factored(gcpRegions),
    officialRegionalCells,
    byCategory: categoryCoverage(products),
    azureByRegion: byRegion,
  };
}

function categoryCoverage(products) {
  const groups = new Map();
  for (const product of products) {
    const group = groups.get(product.category) ?? { category: product.category, products: 0, priced: 0 };
    group.products += 1;
    if (product.listPrice !== "unpublished") group.priced += 1;
    groups.set(product.category, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    percent: Math.round((group.priced / group.products) * 1000) / 10,
  }));
}

export function renderCoverageMarkdown(report) {
  const categories = report.byCategory
    .map((group) => `| ${group.category} | ${group.priced} | ${group.products} | ${group.percent}% |`)
    .join("\n");
  const thin = report.azureByRegion
    .filter((row) => row.percent < 100)
    .map((row) => `| ${row.region} | ${row.percent}% |`)
    .join("\n");
  return `# Catalog coverage

Generated from \`data/product-catalog.json\`, \`data/sku-rates.json\`, \`data/azure-dbu-meters.json\`, and \`data/databricks-dbu-rates.json\`. Estimates only. Cayfore is not affiliated with Databricks.

${report.assumption}

## By product

A product counts as covered when \`listPrice\` is \`distinct\` (its own rate) or \`reused_sku\` (a documented underlying SKU or conversion). \`unpublished\` is a real gap: nothing billable was published, or the only published signal is a meter whose unit is not a rate we can apply.

| | Priced | Products | Coverage |
| --- | ---: | ---: | ---: |
| All | ${report.pricedProducts} | ${report.products} | ${report.productCoveragePercent}% |
${categories}

Unpublished product ids: ${report.unpublishedIds.join(", ") || "none"}.

## By cloud and region

Azure Retail Prices meters fill ${report.azureFilledCells} of ${report.azureCells} cells (${report.azureRegionSkuPercent}%). A cell is one of ${report.azureMeterSkus} mapped SKUs in one of ${report.azureRegions} Azure regions on the rate card. A missing cell still uses the curated US East rate times the Lakehouse Real-Time region factor.

${thin ? `Regions that are not a full meter set:\n\n| Region | Mapped SKUs present |\n| --- | ---: |\n${thin}\n` : "Every Azure region on the rate card has every mapped SKU.\n"}
${report.officialRegionalCells.map((row) => `${row.cloud.toUpperCase()}: ${row.filled} of ${row.cells} cloud/region/edition/SKU cells have a validated exact regional first-party DBU price.`).join("\n\n")}

The resolver uses exact Azure meters or validated Databricks price-card and calculator data before reference fallbacks. A no-region source price is a reference base, and reuse outside its scope remains an estimate. Conflicting first-party prices are withheld pending review. GCP virtual-machine prices remain separate and stay seeds unless \`GCP_BILLING_API_KEY\` is set. See [source evidence and maintenance](UNIT-COSTS.md).
`;
}

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, root), "utf8"));
}

export async function writeCoverageReport() {
  const report = buildCoverage(
    await readJson("data/product-catalog.json"),
    await readJson("data/sku-rates.json"),
    await readJson("data/azure-dbu-meters.json"),
    await readJson("data/databricks-dbu-rates.json"),
  );
  const summary = {
    assumption: report.assumption,
    products: report.products,
    pricedProducts: report.pricedProducts,
    unpublishedProducts: report.unpublishedProducts,
    productCoveragePercent: report.productCoveragePercent,
    azureRegionSkuPercent: report.azureRegionSkuPercent,
    azureRegions: report.azureRegions,
    awsRegions: report.awsRegions,
    gcpRegions: report.gcpRegions,
    officialRegionalCells: report.officialRegionalCells,
  };
  await writeFile(new URL("data/coverage-summary.json", root), JSON.stringify(summary, null, 2) + "\n");
  await writeFile(new URL("docs/COVERAGE.md", root), renderCoverageMarkdown(report));
  await writeProductsDoc();
  const prettier = fileURLToPath(new URL("../node_modules/.bin/prettier", import.meta.url));
  await promisify(execFile)(prettier, ["--write", "docs/COVERAGE.md", "docs/PRODUCTS.md"], {
    cwd: fileURLToPath(root),
  });
  return summary;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("coverage-report.mjs")) {
  writeCoverageReport()
    .then((summary) => console.log(summary.assumption))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
