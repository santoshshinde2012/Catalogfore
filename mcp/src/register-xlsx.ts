import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projectPortfolio } from "../../packages/engine/src/index.ts";
import { DISCLAIMER, portfolioSchema, readToolPortfolio, text } from "./reply.js";

export function registerXlsxTool(server: McpServer) {
  server.registerTool(
    "export_xlsx",
    {
      title: "Export a forecast workbook",
      description:
        "Build a Cayfore Excel workbook for a portfolio. Returns the filename and a base64 .xlsx. Estimates only, not a quote. Not affiliated with Databricks.",
      inputSchema: { portfolio: portfolioSchema() },
    },
    async ({ portfolio }) => {
      const parsed = readToolPortfolio(portfolio);
      if (!parsed.ok) return text({ disclaimer: DISCLAIMER, error: parsed.error });
      const result = projectPortfolio(parsed.value);
      const { buildForecastWorkbook, forecastWorkbookName } = await import("@cayfore/sheet");
      const bytes = await buildForecastWorkbook(result);
      return text({
        disclaimer: DISCLAIMER,
        filename: forecastWorkbookName(parsed.value.cloud),
        workbookBase64: Buffer.from(bytes).toString("base64"),
      });
    },
  );
}
