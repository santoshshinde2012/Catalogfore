import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/databricks-cost-forecaster/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@dcf/engine": path.resolve(__dirname, "../../packages/engine/src/index.ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
