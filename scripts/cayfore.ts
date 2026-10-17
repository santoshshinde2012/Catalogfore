import { readFileSync } from "node:fs";
import {
  blankPortfolio,
  defaultInstanceId,
  defaultPlan,
  estimate,
  planFromUsage,
  projectSimple,
  referenceRegion,
} from "../packages/engine/src/index.ts";
import { forecastProducts, listProducts, productById, workloadsForProduct } from "../packages/engine/src/products.ts";

const [command, file] = process.argv.slice(2);

if (command === "sql") {
  console.log(readFileSync(new URL("../docs/usage-export.sql", import.meta.url), "utf8"));
} else if (command === "usage") {
  if (!file) fail("usage needs a CSV path");
  const loaded = planFromUsage(defaultPlan(), readFileSync(file, "utf8"));
  if (!loaded.ok) fail(loaded.error);
  const projected = projectSimple(loaded.plan);
  console.log(
    JSON.stringify(
      {
        method: loaded.plan.usageForecast?.method ?? "run-rate",
        mape: loaded.plan.usageForecast?.mape ?? null,
        annual: projected.annual,
        spreadPercent: projected.spreadPercent,
        months: projected.months,
      },
      null,
      2,
    ),
  );
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
} else if (command === "estimate" || !command) {
  const projected = projectSimple(defaultPlan());
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
  fail("commands: estimate, usage <file.csv>, sql, products, product <id>");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
