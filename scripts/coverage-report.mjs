import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

export function buildCoverage(catalog, sku, meters) {
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
  const assumption = `Catalog coverage: ${priced.length} of ${products.length} products (${productCoveragePercent}%) have a stored rate or a priced underlying SKU. Azure meters fill ${azureRegionSkuPercent}% of region-and-SKU cells across ${azureRegions.length} regions. AWS (${awsRegions.length} regions) and GCP (${gcpRegions.length} regions) use the US East card times a Lakehouse Real-Time region factor, not a per-region meter.`;
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

Generated from \`data/product-catalog.json\`, \`data/sku-rates.json\`, and \`data/azure-dbu-meters.json\`. Estimates only. Cayfore is not affiliated with Databricks.

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
AWS: ${report.awsFactoredRegions} of ${report.awsRegions} regions have a Lakehouse Real-Time factor (Premium $/DBU ÷ $0.55). None of those regions has a public per-SKU meter. The US East $/DBU table is the curated secondary card in [RESEARCH.md](RESEARCH.md), cross-checked across Flexera 2026, LakeSentry, and OWOX. Databricks does not publish a price JSON, and the website terms disallow scraping the pricing client. Marketplace private listings are not a public rate card.

GCP: ${report.gcpFactoredRegions} of ${report.gcpRegions} regions have a factor. Factors outside the reference region are labeled proxies. No first-party GCP regional DBU table was found. GCP virtual-machine prices stay seeds unless \`GCP_BILLING_API_KEY\` is set for the price refresh.

The default AWS US East forecast is unchanged by this report. Region factors are not a new rate.
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
  };
  await writeFile(new URL("data/coverage-summary.json", root), JSON.stringify(summary, null, 2) + "\n");
  await writeFile(new URL("docs/COVERAGE.md", root), renderCoverageMarkdown(report));
  const prettier = fileURLToPath(new URL("../node_modules/.bin/prettier", import.meta.url));
  await promisify(execFile)(prettier, ["--write", "docs/COVERAGE.md"], { cwd: fileURLToPath(root) });
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
