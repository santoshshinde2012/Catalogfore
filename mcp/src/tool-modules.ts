import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolModule = (server: McpServer) => void;

const modules: ToolModule[] = [];

export function registerToolModule(module: ToolModule): void {
  if (modules.includes(module)) return;
  modules.push(module);
}

export function installTools(server: McpServer): void {
  for (const module of modules) module(server);
}

export function toolModules(): readonly ToolModule[] {
  return modules;
}
