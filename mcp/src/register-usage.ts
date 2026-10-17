import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  UPLOAD_MAX_CHARS,
  blankPortfolio,
  catalog,
  listRegions,
  portfolioFromUsage,
  previewUsageImport,
  pricesUpdatedOn,
  projectPortfolio,
  type Cloud,
} from "../../packages/engine/src/index.ts";
import { DISCLAIMER, text } from "./reply.js";

/** The same preview and real monetary baseline used by the web import. */
export function registerUsageTool(server: McpServer) {
  server.registerTool(
    "forecast_usage",
    {
      title: "Forecast from a usage CSV",
      description:
        "Forecast imported Databricks or FOCUS USD usage. Selects the latest complete month, preserves exported costs and unpriced quantities, and fits contiguous history when available. No cloud VM bill is inferred.",
      inputSchema: {
        csv: z.string().max(UPLOAD_MAX_CHARS).describe("CSV text with a header row. 8 MB at most."),
        cloud: z
          .enum(["aws", "azure", "gcp"])
          .optional()
          .describe("Fallback only when rows do not identify their cloud."),
        tier: z.enum(["premium", "enterprise"]).optional(),
        region: z.string().max(100).optional(),
        asOf: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Inclusive reporting cutoff; defaults to today."),
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional()
          .describe("Explicit baseline month; permits partial-month import with a warning."),
        costBasis: z.enum(["effective", "billed"]).optional(),
      },
    },
    async ({ csv, cloud = "aws", tier = "premium", region, asOf, month, costBasis }) => {
      try {
        const preview = previewUsageImport(csv, {
          asOf: asOf ?? new Date().toISOString().slice(0, 10),
          month,
          costBasis,
        });
        const selectedCloud: Cloud = preview.selectedRecords.find((record) => record.cloud)?.cloud ?? cloud;
        if (region && !listRegions(selectedCloud).some((item) => item.id === region))
          return text({ disclaimer: DISCLAIMER, error: `Unknown ${selectedCloud} region: ${region}` });
        const base = { ...blankPortfolio(selectedCloud), tier, ...(region ? { region } : {}) };
        const loaded = portfolioFromUsage(preview, { base });
        const projected = projectPortfolio(loaded.portfolio);
        const fitted = loaded.portfolio.usage?.forecast;
        return text({
          disclaimer: DISCLAIMER,
          catalogVersion: catalog.version,
          pricesUpdatedOn,
          portfolio: projected.portfolio,
          estimate: projected.estimate,
          forecast: projected.points,
          method: fitted?.method ?? "run-rate",
          mape: fitted?.mape ?? null,
          annual: projected.annual,
          spreadPercent: projected.spreadPercent,
          months: projected.months,
          band: projected.band,
          selectedMonth: preview.selectedMonth,
          asOf: preview.asOf,
          costBasis: preview.costBasis,
          sourceCoverage: projected.portfolio.usage?.coverage,
          estimateCoverage: projected.estimate.coverage,
          warnings: [...new Set([...preview.warnings, ...loaded.warnings, ...projected.estimate.warnings])],
          assumptions: projected.assumptions,
        });
      } catch (error) {
        return text({ disclaimer: DISCLAIMER, error: error instanceof Error ? error.message : "Usage import failed." });
      }
    },
  );
}
