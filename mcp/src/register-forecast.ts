import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  catalog,
  compareScenarios,
  estimate,
  listInstances,
  listRegions,
  projectPortfolio,
  referenceRegion,
  skuRate,
  vmHourly,
  type Cloud,
  type ScenarioPresetId,
  type Tier,
} from "../../packages/engine/src/index.ts";
import { DISCLAIMER, portfolioSchema, readToolPortfolio, text } from "./reply.js";
import { registerUsageTool } from "./register-usage.js";
import { registerXlsxTool } from "./register-xlsx.js";

export function registerForecastTools(server: McpServer) {
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
      const parsed = readToolPortfolio(portfolio);
      if (!parsed.ok) return text({ disclaimer: DISCLAIMER, error: parsed.error });
      const normalized = parsed.value;
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
      const parsed = readToolPortfolio(portfolio);
      if (!parsed.ok) return text({ disclaimer: DISCLAIMER, error: parsed.error });
      const normalized = parsed.value;
      const result = projectPortfolio(normalized);
      return text({ disclaimer: DISCLAIMER, ...result, forecast: result.points });
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
      const parsed = readToolPortfolio(portfolio);
      if (!parsed.ok) return text({ disclaimer: DISCLAIMER, error: parsed.error });
      const normalized = parsed.value;
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

  registerUsageTool(server);
  registerXlsxTool(server);
}
