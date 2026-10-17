import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import "./register-forecast.js";
import "./register-products.js";
import "./register-xlsx.js";
import { installTools, registerToolModule, toolModules } from "./tool-modules.js";

const TOOLS = [
  "compare_scenarios",
  "estimate_product",
  "estimate_workload",
  "export_xlsx",
  "forecast",
  "forecast_usage",
  "list_products",
  "list_skus",
];

describe("mcp tool registry", () => {
  it("installs every tool through the same module contract", () => {
    const names: string[] = [];
    const server = {
      registerTool(name: string) {
        names.push(name);
      },
    } as unknown as McpServer;
    expect(toolModules()).toHaveLength(3);
    for (const module of toolModules()) expect(module).toBeTypeOf("function");
    installTools(server);
    expect([...names].sort()).toEqual(TOOLS);
  });

  it("ignores a module that is already registered", () => {
    const before = toolModules().length;
    registerToolModule(toolModules()[0]);
    expect(toolModules()).toHaveLength(before);
  });
});
