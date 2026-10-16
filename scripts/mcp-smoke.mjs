import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["mcp/dist/index.js"],
  stderr: "pipe",
});
const client = new Client({ name: "cayfore-smoke", version: "0.0.0" });
await client.connect(transport);
const listed = await client.listTools();
const names = listed.tools.map((tool) => tool.name).sort();
const expected = [
  "compare_scenarios",
  "estimate_product",
  "estimate_workload",
  "forecast",
  "forecast_usage",
  "list_products",
  "list_skus",
];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  console.error("Unexpected tools", names);
  process.exit(1);
}
const estimated = await client.callTool({
  name: "estimate_workload",
  arguments: {
    portfolio: {
      name: "Smoke",
      cloud: "aws",
      region: "us-east-1",
      tier: "premium",
      workloads: [
        {
          id: "job",
          name: "Nightly",
          kind: "cluster",
          sku: "jobs_classic",
          instanceId: "m5.xlarge",
          scale: { min: 2, max: 2, utilization: 1 },
          photon: false,
          spotShare: 0,
          spotDiscount: 0.6,
          schedule: { hoursPerDay: 8, daysPerWeek: 5 },
        },
      ],
    },
  },
});
const body = JSON.parse(estimated.content[0].text);
if (body.estimate.dbuCost !== 53.82 || body.estimate.cloudCost !== 99.84) {
  console.error("Unexpected estimate", body.estimate);
  process.exit(1);
}
if (!String(body.disclaimer).toLowerCase().includes("estimates only")) {
  console.error("Missing disclaimer");
  process.exit(1);
}
const fitted = await client.callTool({
  name: "forecast_usage",
  arguments: {
    csv: ["sku_name,usage_quantity,usage_unit", "JOBS_COMPUTE,1000,DBU", "SERVERLESS_SQL,400,DBU"].join("\n"),
  },
});
const usageBody = JSON.parse(fitted.content[0].text);
if (usageBody.method !== "run-rate" || !(usageBody.annual > 0)) {
  console.error("Unexpected usage forecast", usageBody);
  process.exit(1);
}
const listedProducts = await client.callTool({ name: "list_products", arguments: {} });
const productBody = JSON.parse(listedProducts.content[0].text);
if (!productBody.products.some((product) => product.id === "jobs_classic" && product.published === true)) {
  console.error("Product catalog missing jobs_classic");
  process.exit(1);
}
const unpublished = await client.callTool({ name: "estimate_product", arguments: { productId: "databricks_one" } });
const unpublishedBody = JSON.parse(unpublished.content[0].text);
if (unpublishedBody.estimate.total !== 0 || unpublishedBody.product.published !== false) {
  console.error("Unpublished product was priced", unpublishedBody.estimate);
  process.exit(1);
}
await client.close();
console.log("MCP smoke ok", names.join(", "));
