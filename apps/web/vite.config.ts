import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { BASE_PATH, PAGE_DESCRIPTION, SITE } from "./src/site";

/** Production-only CSP and JSON-LD. Dev keeps the Vite client, which needs inline scripts. */
function productionPolicy(env: Record<string, string>): Plugin {
  const plausible = (env.VITE_PLAUSIBLE_DOMAIN ?? "").trim();
  const usePlausible = /^[a-z0-9.-]+$/i.test(plausible);
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
  const hash = createHash("sha256").update(json).digest("base64");
  const scriptSrc = ["'self'", `'sha256-${hash}'`];
  const connectSrc = ["'self'"];
  if (usePlausible) {
    scriptSrc.push("https://plausible.io");
    connectSrc.push("https://plausible.io");
  }
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return {
    name: "cayfore-production-policy",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const cspTag = `    <meta http-equiv="Content-Security-Policy" content="${csp}" />`;
      const jsonTag = `    <script type="application/ld+json">${json}</script>`;
      return html.replace("<head>", `<head>\n${cspTag}`).replace("</head>", `${jsonTag}\n  </head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  return {
    base: BASE_PATH,
    plugins: [react(), tailwindcss(), productionPolicy(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@cayfore/engine": path.resolve(__dirname, "../../packages/engine/src/index.ts"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
  };
});
