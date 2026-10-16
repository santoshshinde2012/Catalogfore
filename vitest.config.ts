import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/engine/src/**/*.test.ts", "packages/catalog/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["packages/engine/src/**/*.ts"],
      exclude: ["packages/engine/src/**/*.test.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
});
