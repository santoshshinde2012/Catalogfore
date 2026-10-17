import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { redactSecrets } from "./redact.js";
import "./register-forecast.js";
import "./register-products.js";
import "./register-xlsx.js";
import { installTools } from "./tool-modules.js";

/** stdio MCP server. Tools call the engine. This file does not price a SKU itself. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "cayfore", version: "0.1.0" });
  installTools(server);
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
    const message = error instanceof Error ? error.message : "MCP server failed";
    console.error(redactSecrets(message));
    process.exit(1);
  });
}
