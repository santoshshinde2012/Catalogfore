import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { productionCsp } from "./src/csp";
import { BASE_PATH, PAGE_DESCRIPTION, SITE } from "./src/site";

/** Production-only CSP and JSON-LD. Dev keeps the Vite client, which needs inline scripts. */
function productionPolicy(): Plugin {
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Cayfore",
        url: SITE,
        description: PAGE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": ["WebApplication", "SoftwareApplication"],
        name: "Cayfore",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Databricks cost calculator",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        url: SITE,
        image: `${SITE}og.png`,
        description: PAGE_DESCRIPTION,
        featureList: ["Databricks cost calculator", "DBU forecast", "Databricks pricing estimator"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
        inLanguage: "en",
      },
    ],
  });
  const csp = productionCsp(json);
  return {
    name: "cayfore-production-policy",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const note =
        "    <!-- frame-ancestors is ignored in a meta policy. GitHub Pages cannot send it as a response header. -->";
      const cspTag = `    <meta http-equiv="Content-Security-Policy" content="${csp}" />`;
      const jsonTag = `    <script type="application/ld+json">${json}</script>`;
      return html.replace("<head>", `<head>\n${note}\n${cspTag}`).replace("</head>", `${jsonTag}\n  </head>`);
    },
  };
}

export default defineConfig(() => {
  return {
    base: BASE_PATH,
    plugins: [react(), tailwindcss(), productionPolicy()],
    build: {
      // The landing chunk is the calculator. The product catalog stays on the Advanced chunk.
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@cayfore/engine/products": path.resolve(__dirname, "../../packages/engine/src/products.ts"),
        "@cayfore/engine": path.resolve(__dirname, "../../packages/engine/src/index.ts"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
  };
});
