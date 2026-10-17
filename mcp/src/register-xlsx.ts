import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DISCLAIMER, forecastOf, portfolioSchema, text } from "./reply.js";
import { registerToolModule } from "./tool-modules.js";

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
      const forecasted = forecastOf(portfolio);
      if (!forecasted.ok) return forecasted.reply;
      const { buildForecastWorkbook, forecastWorkbookName } = await import("@cayfore/sheet");
      const bytes = await buildForecastWorkbook(forecasted.result);
      return text({
        disclaimer: DISCLAIMER,
        filename: forecastWorkbookName(forecasted.portfolio.cloud),
        workbookBase64: Buffer.from(bytes).toString("base64"),
      });
    },
  );
}

registerToolModule(registerXlsxTool);
