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
      name: "engine-json-through-sources",
      comment: "Versioned JSON enters the engine through one loader per file.",
      severity: "error",
      from: { path: "^packages/engine", pathNot: "^packages/engine/src/catalog/sources/" },
      to: { path: "\\.json$" },
    },
    {
      name: "confidence-stays-with-excel",
      comment: "Cell confidence scores load with the workbook, not the forecast page.",
      severity: "error",
      from: {
        path: "^packages/engine",
        pathNot: "^packages/engine/src/catalog/sources/rate-confidence",
      },
      to: { path: "rate-confidence" },
    },
    {
      name: "presentation-not-price-files",
      comment: "The web app, Excel export, and MCP server read prices through the engine.",
      severity: "error",
      from: { path: "^(apps/|packages/sheet|mcp/)" },
      to: { path: "\\.json$" },
    },
    {
      name: "catalog-owns-product-documents",
      comment: "The product catalog package loads only its inventory and learning map.",
      severity: "error",
      from: { path: "^packages/catalog" },
      to: { path: "\\.json$", pathNot: "(product-catalog|product-map)\\.json$" },
    },
    {
      name: "web-services-not-presentation",
      comment: "Application services stay free of React and the page. Presentation depends on them.",
      severity: "error",
      from: { path: "^apps/web/src/services" },
      to: { path: ["^apps/web/src/(components|hooks)", "(^|/)react$", "(^|/)react-dom$"] },
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
