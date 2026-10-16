import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  catalog,
  compareScenarios,
  defaultPlan,
  estimate,
  forecast,
  listInstances,
  planFromUsage,
  pricesUpdatedOn,
  projectSimple,
  listRegions,
  blankPortfolio,
  defaultInstanceId,
  normalizePortfolio,
  referenceRegion,
  skuRate,
  vmHourly,
  type Cloud,
  type ScenarioPresetId,
  type Tier,
} from "../../packages/engine/src/index.ts";
import {
  forecastProducts,
  listProducts,
  productById,
  productCatalogMeta,
  workloadForProduct,
} from "../../packages/engine/src/products.ts";

const DISCLAIMER = catalog.disclaimer;

function text(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function portfolioSchema() {
  return z
    .record(z.unknown())
    .describe("A forecast portfolio. Missing fields are filled from the small-analytics defaults.");
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "cayfore",
    version: "0.1.0",
  });

  server.registerTool(
    "list_skus",
    {
      title: "List Databricks SKUs",
      description:
        "List curated Databricks SKU rates, regions, instances, and whether the rate includes cloud compute. Estimates only, not a quote.",
      inputSchema: {
        cloud: z.enum(["aws", "azure", "gcp"]).optional(),
        tier: z.enum(["premium", "enterprise"]).optional(),
      },
    },
    async ({ cloud = "aws", tier = "premium" }) => {
      const selected = cloud as Cloud;
      const selectedTier = tier as Tier;
      const skus = Object.entries(catalog.rates[selected][selectedTier]).map(([sku, rate]) => ({
        sku,
        label: catalog.skuLabels[sku as keyof typeof catalog.skuLabels],
        usdPerDbu: rate,
        includesCompute: catalog.includesCompute[sku as keyof typeof catalog.includesCompute],
      }));
      return text({
        disclaimer: DISCLAIMER,
        catalogVersion: catalog.version,
        verifiedOn: catalog.verifiedOn,
        cloud: selected,
        tier: selectedTier,
        note:
          selected === "azure" && selectedTier === "enterprise"
            ? "Azure publishes one plan. Enterprise uses the same list rates as Azure Premium."
            : undefined,
        skus,
        sqlDbuPerHour: catalog.sqlDbuPerHour,
        regions: listRegions(selected),
        instances: listInstances(selected).map((instance) => {
          const price = vmHourly(selected, referenceRegion[selected], instance.id);
          return {
            ...instance,
            referenceRegion: referenceRegion[selected],
            onDemandHourly: price.hourly,
            priceSource: price.source,
          };
        }),
        foundationModels: catalog.foundationModels,
        servingGpu: catalog.servingGpuDbuPerHour,
        photonMultiplier: catalog.photonMultiplier,
        jobsClassicRateCheck: skuRate(selected, selectedTier, "jobs_classic"),
      });
    },
  );

  server.registerTool(
    "estimate_workload",
    {
      title: "Estimate a portfolio",
      description:
        "Estimate monthly DBU and cloud infrastructure cost for a portfolio of Databricks workloads. Returns an estimate, not a quote.",
      inputSchema: { portfolio: portfolioSchema() },
    },
    async ({ portfolio }) => {
      const normalized = normalizePortfolio(portfolio);
      return text({ disclaimer: DISCLAIMER, portfolio: normalized, estimate: estimate(normalized) });
    },
  );

  server.registerTool(
    "forecast",
    {
      title: "Forecast a portfolio",
      description: "Project a portfolio for 12, 24, or 36 months with growth and seasonality. Estimates only.",
      inputSchema: { portfolio: portfolioSchema() },
    },
    async ({ portfolio }) => {
      const normalized = normalizePortfolio(portfolio);
      const result = estimate(normalized);
      return text({
        disclaimer: DISCLAIMER,
        portfolio: normalized,
        estimate: result,
        forecast: forecast(result, normalized.forecast),
      });
    },
  );

  server.registerTool(
    "compare_scenarios",
    {
      title: "Compare cost scenarios",
      description:
        "Compare presets: as_modeled, jobs_serverless, photon_on, photon_speedup_2, spot_70, commit_37, commit_37_cloud_30. The 2× Photon case is an assumption, not a measured speedup.",
      inputSchema: {
        portfolio: portfolioSchema(),
        presets: z
          .array(
            z.enum([
              "as_modeled",
              "jobs_serverless",
              "photon_on",
              "photon_speedup_2",
              "spot_70",
              "commit_37",
              "commit_37_cloud_30",
            ]),
          )
          .optional(),
      },
    },
    async ({ portfolio, presets }) => {
      const normalized = normalizePortfolio(portfolio);
      const chosen = (presets?.length ? presets : ["as_modeled", "jobs_serverless", "commit_37"]) as ScenarioPresetId[];
      const results = compareScenarios(normalized, chosen).map((result) => ({
        id: result.id,
        name: result.name,
        description: result.description,
        monthly: result.estimate.total,
        dbuCost: result.estimate.dbuCost,
        cloudCost: result.estimate.cloudCost,
        annual: result.annual,
      }));
      return text({ disclaimer: DISCLAIMER, catalogVersion: catalog.version, results });
    },
  );

  server.registerTool(
    "forecast_usage",
    {
      title: "Forecast from a usage CSV",
      description:
        "Fit a 12-month forecast from a system.billing.usage CSV. Include list_price when you joined system.billing.list_prices. A single month scales the run rate. Six or more months fit a trend. Estimates only.",
      inputSchema: { csv: z.string().describe("CSV text with a header row.") },
    },
    async ({ csv }) => {
      const loaded = planFromUsage(defaultPlan(), csv);
      if (!loaded.ok) return text({ disclaimer: DISCLAIMER, error: loaded.error });
      const projected = projectSimple(loaded.plan);
      return text({
        disclaimer: DISCLAIMER,
        catalogVersion: catalog.version,
        pricesUpdatedOn,
        method: loaded.plan.usageForecast?.method ?? "run-rate",
        mape: loaded.plan.usageForecast?.mape ?? null,
        annual: projected.annual,
        spreadPercent: projected.spreadPercent,
        months: projected.months,
      });
    },
  );

  server.registerTool(
    "list_products",
    {
      title: "List Databricks products",
      description:
        "List every Cayfore product: billing unit, whether a list rate is published, confidence, and the source. Unpublished rows are not given a guessed price.",
      inputSchema: {},
    },
    async () => {
      const meta = productCatalogMeta();
      return text({
        disclaimer: DISCLAIMER,
        productCatalogVersion: meta.version,
        verifiedOn: meta.verifiedOn,
        products: listProducts().map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          billingUnit: product.billingUnit,
          sku: product.sku,
          listPrice: product.listPrice,
          published: product.published,
          confidence: product.confidence,
          automation: product.automation,
          source: product.source,
          note: product.note,
        })),
      });
    },
  );

  server.registerTool(
    "estimate_product",
    {
      title: "Estimate one Databricks product",
      description:
        "Forecast one catalog product with its defaults. Returns this month and 12 months. Unpublished products are $0. Estimates only, not a quote.",
      inputSchema: {
        productId: z.string().describe("Product id from list_products."),
        cloud: z.enum(["aws", "azure", "gcp"]).optional(),
        region: z.string().optional(),
        tier: z.enum(["premium", "enterprise"]).optional(),
      },
    },
    async ({ productId, cloud = "aws", region, tier = "premium" }) => {
      const product = productById(productId);
      if (!product) {
        return text({
          disclaimer: DISCLAIMER,
          error: `Unknown product "${productId}".`,
          ids: listProducts().map((item) => item.id),
        });
      }
      const selected = cloud as Cloud;
      const workload = workloadForProduct(product.id);
      if (workload.kind === "cluster") workload.instanceId = defaultInstanceId(selected);
      const portfolio = {
        ...blankPortfolio(selected),
        region: region || referenceRegion[selected],
        tier: tier as Tier,
        workloads: [workload],
      };
      const result = estimate(portfolio);
      return text({
        disclaimer: DISCLAIMER,
        product: {
          id: product.id,
          name: product.name,
          billingUnit: product.billingUnit,
          published: product.published,
          confidence: product.confidence,
          note: product.note,
        },
        estimate: result,
        forecast: forecastProducts(result, portfolio),
      });
    },
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("index.ts") || entry.endsWith("index.js")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
