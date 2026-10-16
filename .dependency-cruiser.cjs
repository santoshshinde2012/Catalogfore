/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "engine-not-presentation",
      comment: "Domain and application code do not import React, the page, or the MCP server.",
      severity: "error",
      from: { path: "^packages/engine" },
      to: { path: ["^apps/", "^mcp/", "(^|/)react$", "(^|/)react-dom$"] },
    },
    {
      name: "catalog-not-engine",
      comment: "The catalog schema does not depend on the pricing engine.",
      severity: "error",
      from: { path: "^packages/catalog" },
      to: { path: ["^packages/engine", "^apps/", "^mcp/"] },
    },
    {
      name: "costing-not-application",
      comment: "A cost strategy does not forecast, import a CSV, or read the product catalog module.",
      severity: "error",
      from: { path: "^packages/engine/src/costing" },
      to: {
        path: [
          "^packages/engine/src/products",
          "^packages/engine/src/product-forecast",
          "^packages/engine/src/simple/",
          "^packages/engine/src/usage",
          "^packages/engine/src/recommend",
          "^packages/engine/src/formulas/",
        ],
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
    },
  },
};
