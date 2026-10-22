import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { expect, it } from "vitest";
import { listProducts } from "../../packages/engine/src/products.js";
import { registerProductTools } from "./register-products.js";

it("reports an unpublished product as an unresolved subtotal rather than a free service", async () => {
  let estimateProduct: ((args: { productId: string }) => Promise<CallToolResult>) | undefined;
  let description = "";
  const server = {
    registerTool(
      name: string,
      config: { description: string },
      handler: (args: { productId: string }) => Promise<CallToolResult>,
    ) {
      if (name !== "estimate_product") return;
      estimateProduct = handler;
      description = config.description;
    },
  } as unknown as McpServer;
  registerProductTools(server);
  const unpublished = listProducts().find((product) => product.listPrice === "unpublished");
  expect(unpublished).toBeDefined();
  expect(estimateProduct).toBeDefined();
  const reply = await estimateProduct!({ productId: unpublished!.id });
  const content = reply.content[0];
  expect(content.type).toBe("text");
  if (content.type !== "text") throw new Error("Expected a JSON text reply");
  const result = JSON.parse(content.text);
  expect(result.product.published).toBe(false);
  expect(result.estimate.coverage.complete).toBe(false);
  expect(result.estimate.coverage.unpricedLines).toBeGreaterThan(0);
  expect(result.estimate.coverage.freeLines).toBe(0);
  expect(result.estimate.warnings).toContainEqual(expect.stringContaining("known subtotal"));
  expect(description).toContain("known subtotal");
  expect(description).not.toContain("is $0");
});
