# Plan

Last updated: **2026-10-16**. Sources live in [RESEARCH.md](./RESEARCH.md). Module boundaries live in [ARCHITECTURE.md](./ARCHITECTURE.md).

The public page opens on four inputs: cloud and tier, a starting monthly amount or a team size, a mix of pipelines, dashboards, and models, and monthly growth (3% a month by default) with an optional commitment discount. It answers with a 12-month range. Advanced opens the per-workload editor. Prices come from the engine.

## Product

Cayfore is a static forecast of Databricks spend. It is an estimate, not a quote, and it is not affiliated with Databricks.

The page lets someone:

- Choose AWS, Azure, or GCP, and Premium or Enterprise.
- Start from Small, Medium, or Large, or type a monthly amount.
- Set a mix and a monthly growth rate, and an optional commitment discount on the Databricks portion.
- Read a low-to-high year, export CSV, JSON, or PDF, or copy a link.
- Replace the amount and the mix with a `system.billing.usage` CSV.
- Edit a workload directly from Advanced.

The engine still prices classic and serverless jobs, SQL warehouses, pipelines, model serving, Foundation Model API calls, AI Search, Databricks Apps, Lakebase, storage, and egress. It forecasts with growth, compares scenarios, and ranks savings. That catalog is not the first screen.

Every total is an estimate. The footer and the export both say so.

## What we will not do in this pass

- Call a Databricks workspace, scrape the logged-in price UI, or ship cloud credentials.
- Pretend spot discounts, Photon speedups, or negotiated commits are known. They are inputs with labeled defaults.
- Model every instance and every foundation model. The catalogs are curated; the schema allows more rows later.
- Tax, support plans, and marketplace software.

## Repository layout

npm workspaces so `npm install` at the root installs everything and `npm run dev` starts the site.

```
package.json                 workspaces, dev / test / build / lint scripts
packages/engine/             pure TypeScript pricing + forecast, no DOM
packages/engine/src/         estimate, forecast, scenarios, usage import, tips
data/                        versioned JSON catalogs (imported by engine and web)
apps/web/                    Vite + React + TypeScript + Tailwind
mcp/                         stdio MCP server, depends on packages/engine
scripts/refresh-prices.mjs   Azure Retail Prices + AWS offer files → data/cloud-vm-prices.json
.github/workflows/pages.yml
.github/workflows/refresh-prices.yml
docs/RESEARCH.md
docs/PLAN.md
```

The engine is the only place that multiplies rates. The web app and the MCP server both call it. Vitest covers the engine (DBU vs VM split, Photon not applied to serverless or SQL, spot not discounting DBUs, commitment not discounting spot hours, seasonality over 12 months, usage CSV scale factor, share-state round trip).

## Pricing data

| File                     | Contents                                                                                                                                                                   | Who updates it                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `data/sku-rates.json`    | US East list $/DBU by cloud, tier, SKU; SQL DBU ladder; serving and FM API DBU factors; DSU and Lakebase assumptions; Photon multiplier; region factors; promotion windows | Human review. A workflow may open a PR later; it does not silently rewrite DBU list prices.                   |
| `data/instances.json`    | Curated instances: cloud, id, family, vCPU, memory, DBU/hour                                                                                                               | DBU/hour is a cited table. The refresh does not overwrite it. VM $/hour lives in `data/cloud-vm-prices.json`. |
| `data/catalog-meta.json` | `version`, `verifiedOn`, disclaimer string                                                                                                                                 | Bumped when either file changes.                                                                              |

Refresh workflow (weekly cron plus `workflow_dispatch`):

- Azure: unauthenticated Retail Prices API for the curated VM names in the curated regions.
- AWS: public EC2 offer file for those regions, Linux, shared tenancy, on-demand.
- GCP: pinned rates unless `GCP_BILLING_API_KEY` is present.
- Writes `data/cloud-vm-prices.json` and a short note in the run summary. The Action commits only when a price actually changed, on a bot branch, so `main` does not move under an open feature PR by surprise. Until that automation is trusted, the checked-in file is the runtime source and the script is runnable locally.

## Engine behavior

`estimate(portfolio, catalog) → breakdown`

- Resolves tier, region factor, and SKU rate.
- Classic compute: `(driver + workers) × dbuPerHour × photonMultiplier × hours`.
- Hours: `hoursPerDay × daysPerWeek × 52/12`, scaled by utilization between min and max (`min + (max − min) × utilization`).
- Spot: worker cloud hours only, `spotShare` at `spotDiscount`, the rest on demand. Optional cloud-commit percent on the on-demand remainder.
- DBU commitment percent on the DBU line only.
- Serverless jobs, serverless SQL, serving, Apps, and FM APIs: no VM line.
- SQL classic/pro: published DBU/hour for the t-shirt, plus an overridable VM equivalent.
- Storage and egress: simple GB lines.
- Add-on percent (0, 10, or 30) on workspace DBU cost.

`forecast(estimate, { months, annualGrowth, seasonality }) → points[]`

- Month 0 is the steady-state estimate.
- Growth compounds monthly from the annual rate: `(1 + annualGrowth) ^ (1/12) − 1`.
- Seasonality is 12 multipliers (default all 1). A built-in “retail year” preset dips in late winter and rises in November.
- Each point splits DBU, cloud, and total, and can be recomputed under a second commitment so the chart overlays pay-as-you-go and commit.

`compare(scenarios[])` runs estimate + forecast per scenario and returns aligned totals. `tips(estimate)` returns plain sentences when a rule trips (all-purpose rate on a long schedule, min=max on a warehouse, spot share on a driver-only cluster, commit discount with declining growth). `importUsage(csv)` parses the system-table columns documented in RESEARCH.md and returns DBU by SKU for the latest full month; the UI offers “scale this portfolio so month 0 matches that total.”

## Web app

Vite `base` is `/databricks-cost-forecaster/` so GitHub Pages resolves assets. The interface is React, Tailwind, and Radix. Light is the default. Dark mode sets `data-theme="dark"`.

Layout:

1. Top bar: wordmark, theme, and open a saved forecast.
2. Inputs on the left. On a wide screen the result stays in a sticky panel: year total, range, chart, and exports. On a narrow screen the result follows the inputs, and the year total stays pinned to the bottom.
3. Assumptions, savings, and the note for existing customers sit below the two columns.
4. Unknown addresses serve `404.html`.

The URL hash stores the portfolio. Save and load use a JSON file on the device. Nothing is uploaded.

Accessibility: visible focus, a name on every input, contrast that holds in both themes, and the chart repeated as a month table. The chart legend does not rely on color alone.

## MCP

`mcp/` is a TypeScript package using `@modelcontextprotocol/sdk` over stdio. It imports `packages/engine` and the same JSON. Tools:

- `list_skus` — clouds, tiers, SKUs, and whether the rate includes compute.
- `estimate_workload` — one workload or a portfolio, returns the breakdown.
- `forecast` — months, growth, seasonality.
- `compare_scenarios` — two portfolios.

README section tells an assistant user to point their MCP config at `node mcp/dist/index.js`. The server prints the disclaimer in every tool result.

## Delivery

- `npm test` runs Vitest.
- `npm run build` builds the web app and the MCP server.
- `npm run dev` starts Vite.
- GitHub Actions workflow `pages.yml`: on push to `main`, `npm ci`, `npm test`, `npm run build`, deploy `apps/web/dist` with `actions/deploy-pages`. Permissions: `contents: read`, `pages: write`, `id-token: write`.
- MIT license, CONTRIBUTING (how to refresh a rate, how to run tests), README with the Pages URL, a screenshot, local dev, and the manual step the owner must take.

## Owner setup (cannot be done from this repo alone)

GitHub Pages → Build and deployment → Source: **GitHub Actions**. The default “Deploy from a branch” setting will not run `pages.yml`. No custom domain and no secrets are required for the first deploy. GCP price refresh stays pinned until someone adds `GCP_BILLING_API_KEY`.

## Done when

Tests pass, `npm run build` succeeds, `pages.yml` and `refresh-prices.yml` are in the tree, the README explains local dev and Pages, and a pull request is open against `main`.
