import { readFileSync } from "node:fs";
import {
  blankPortfolio,
  defaultInstanceId,
  defaultPlan,
  estimate,
  parseSavedForecast,
  parseUntrustedJson,
  portfolioFromUsage,
  previewUsageImport,
  projectPortfolio,
  listRegions,
  type Cloud,
  type Tier,
  projectSimple,
  referenceRegion,
  UPLOAD_MAX_CHARS,
  type PortfolioProjection,
} from "../packages/engine/src/index.ts";
import { forecastProducts, listProducts, productById, workloadsForProduct } from "../packages/engine/src/products.ts";
import { takeOption } from "./cli-args.mjs";

const argv = process.argv.slice(2);
const [command, ...tail] = argv;
const xlsx = readXlsxFlag(tail);
const xlsxPath = xlsx.value;
const [file, ...flags] = xlsx.rest;

if (command === "sql") {
  console.log(readFileSync(new URL("../docs/usage-export.sql", import.meta.url), "utf8"));
} else if (command === "usage") {
  if (!file) fail("usage needs a CSV path");
  try {
    const options = usageOptions(flags);
    const preview = previewUsageImport(readFileSync(file, "utf8"), options);
    const selectedCloud = preview.selectedRecords.find((record) => record.cloud)?.cloud ?? options.cloud;
    if (options.region && !listRegions(selectedCloud).some((region) => region.id === options.region))
      fail(`Unknown ${selectedCloud} region: ${options.region}`);
    const base = {
      ...blankPortfolio(selectedCloud),
      tier: options.tier,
      ...(options.region ? { region: options.region } : {}),
    };
    const loaded = portfolioFromUsage(preview, { base });
    const projected = projectPortfolio(loaded.portfolio);
    const fitted = loaded.portfolio.usage?.forecast;
    console.log(
      JSON.stringify(
        {
          ...projected,
          forecast: projected.points,
          method: fitted?.method ?? "run-rate",
          mape: fitted?.mape ?? null,
          selectedMonth: preview.selectedMonth,
          asOf: preview.asOf,
          costBasis: preview.costBasis,
          sourceCoverage: loaded.portfolio.usage?.coverage,
          estimateCoverage: projected.estimate.coverage,
          warnings: [...new Set([...preview.warnings, ...loaded.warnings, ...projected.estimate.warnings])],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : "Usage import failed.");
  }
} else if (command === "rates") {
  try {
    const { printUnitCosts } = await import("./unit-costs-cli.ts");
    printUnitCosts(tail);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not export unit costs.");
  }
} else if (command === "products") {
  for (const product of listProducts()) {
    const price = product.published
      ? "published"
      : product.listPrice === "reused_sku"
        ? "reuses another SKU"
        : "unpublished";
    console.log(`${product.id}\t${product.category}\t${product.billingUnit}\t${price}`);
  }
} else if (command === "product") {
  if (!file) fail("product needs an id from `products`");
  const product = productById(file);
  if (!product) fail(`Unknown product "${file}"`);
  const workloads = workloadsForProduct(product.id).map((workload) =>
    workload.kind === "cluster" ? { ...workload, instanceId: defaultInstanceId("aws") } : workload,
  );
  const portfolio = { ...blankPortfolio("aws"), region: referenceRegion.aws, workloads };
  const result = estimate(portfolio);
  const projected = forecastProducts(result, portfolio);
  console.log(
    JSON.stringify(
      {
        id: product.id,
        name: product.name,
        published: product.published,
        monthly: result.total,
        year: projected.year,
        note: product.note,
      },
      null,
      2,
    ),
  );
} else if (command === "forecast" || (command === "estimate" && file)) {
  if (!file) fail("forecast needs a saved JSON path");
  try {
    const saved = parseSavedForecast(parseUntrustedJson(readFileSync(file, "utf8"), UPLOAD_MAX_CHARS));
    if (!saved.ok) fail(saved.error);
    const projected = projectPortfolio(saved.value);
    await writeXlsx(projected, xlsxPath);
    console.log(JSON.stringify({ ...projected, forecast: projected.points }, null, 2));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not read forecast.");
  }
} else if (command === "estimate" || !command) {
  const projected = projectSimple(defaultPlan());
  await writeXlsx(projected, xlsxPath);
  console.log(
    JSON.stringify(
      {
        annual: projected.annual,
        firstMonth: projected.months[0]?.expected,
        spreadPercent: projected.spreadPercent,
        pricesLine: projected.assumptions.find((line) => line.startsWith("Prices updated")),
      },
      null,
      2,
    ),
  );
} else {
  fail(
    "commands: estimate [--xlsx out.xlsx] [plan.json], forecast <plan.json> [--xlsx out.xlsx], usage <file.csv> [--cloud aws|azure|gcp --tier premium|enterprise --region id --as-of YYYY-MM-DD --month YYYY-MM --cost-basis effective|billed], sql, products, product <id>, rates [--format json|csv --product id --cloud aws|azure|gcp --region id --tier premium|enterprise --evidence official|derived|estimate|unresolved|not_applicable]",
  );
}

function readXlsxFlag(args: string[]) {
  try {
    return takeOption(args, "--xlsx");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "--xlsx needs a value");
  }
}

async function writeXlsx(projected: PortfolioProjection, path: string | undefined) {
  if (!path) return;
  const { writeForecastWorkbook } = await import("../packages/sheet/src/write.ts");
  await writeForecastWorkbook(projected, path);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function usageOptions(args: string[]) {
  const selected: Record<string, string> = {};
  const allowed = ["--cloud", "--tier", "--region", "--as-of", "--month", "--cost-basis"];
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!allowed.includes(key) || !value || value.startsWith("--")) fail(`Invalid usage option: ${key}`);
    selected[key] = value;
  }
  const cloud = selected["--cloud"] ?? "aws";
  const tier = selected["--tier"] ?? "premium";
  if (!["aws", "azure", "gcp"].includes(cloud)) fail("cloud must be aws, azure, or gcp");
  if (!["premium", "enterprise"].includes(tier)) fail("tier must be premium or enterprise");
  const asOf = selected["--as-of"] ?? new Date().toISOString().slice(0, 10);
  const month = selected["--month"];
  const costBasis = selected["--cost-basis"];
  if (asOf && (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(asOf))))
    fail("as-of must be YYYY-MM-DD");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail("month must be YYYY-MM");
  if (costBasis && costBasis !== "effective" && costBasis !== "billed") fail("cost-basis must be effective or billed");
  return {
    cloud: cloud as Cloud,
    tier: tier as Tier,
    region: selected["--region"],
    asOf,
    month,
    costBasis: costBasis as "effective" | "billed" | undefined,
  };
}
