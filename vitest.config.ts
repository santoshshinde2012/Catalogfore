import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/engine/src/**/*.test.ts", "packages/catalog/src/**/*.test.ts"],
  },
});
