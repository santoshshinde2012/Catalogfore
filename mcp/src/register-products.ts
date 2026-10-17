import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  blankPortfolio,
  defaultInstanceId,
  estimate,
  referenceRegion,
  type Cloud,
  type Tier,
} from "../../packages/engine/src/index.ts";
import {
  forecastProducts,
  listProducts,
  productById,
  productCatalogMeta,
  workloadsForProduct,
} from "../../packages/engine/src/products.ts";
import { DISCLAIMER, text } from "./reply.js";
import { registerToolModule } from "./tool-modules.js";

export function registerProductTools(server: McpServer) {
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
        "Forecast one catalog product with its defaults, including every underlying SKU when the product is a composition. Returns this month and 12 months. A product with no published rate is $0. Estimates only, not a quote.",
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
      const workloads = workloadsForProduct(product.id).map((workload) =>
        workload.kind === "cluster" ? { ...workload, instanceId: defaultInstanceId(selected) } : workload,
      );
      const portfolio = {
        ...blankPortfolio(selected),
        region: region || referenceRegion[selected],
        tier: tier as Tier,
        workloads,
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
}

registerToolModule(registerProductTools);
