# Plan

Last updated: **2026-10-16**. Pricing assumptions and sources live in [RESEARCH.md](./RESEARCH.md). This file is the build plan those findings imply.

The public page now opens on a four-input year forecast (cloud and tier, starting spend or a team preset, workload mix, monthly growth and an optional commitment discount). The portfolio builder below is the Advanced disclosure. The simple forecast only assembles workloads; prices still come from the strategies in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Product

A static, public Databricks cost **forecast**, not another single-cluster DBU snapshot.

Someone modeling a platform should be able to:

- Start from a template (small analytics team, ML platform, streaming ETL) or a blank portfolio.
- Add workloads: classic and serverless jobs, all-purpose clusters, SQL warehouses, Lakeflow pipelines, model serving, Foundation Model API calls, AI Search, Databricks Apps, Lakebase, plus storage and egress lines.
- Set cloud, region, and tier once, and override them per workload when a platform is split.
- Describe a schedule: hours per day, days per week, min/max nodes or warehouse scale, average utilization between min and max, Photon, and a spot share on workers.
- See DBU cost and cloud infra cost separately, for the month and the year, updating as they type.
- Project 12, 24, or 36 months with a growth rate and a simple seasonality curve.
- Put two or three scenarios side by side (classic vs serverless, Photon on vs off, pay-as-you-go vs a 37% DBU commit, spot mix).
- Read short, computed tips (all-purpose used like a job, warehouse pinned at max overnight, commit larger than the forecast, Photon multiplier with no runtime reduction).
- Share the estimate as a URL, save and load JSON locally, and export CSV, JSON, and PDF.
- Import a `system.billing.usage` CSV so last month’s actual DBU quantity scales the forecast.
- Use the site in light or dark mode, on a phone, and from the keyboard.

Every total is an estimate. The footer and the export both say so, and both name the catalog version and the date it was verified.

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

| File                     | Contents                                                                                                                                                                   | Who updates it                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `data/sku-rates.json`    | US East list $/DBU by cloud, tier, SKU; SQL DBU ladder; serving and FM API DBU factors; DSU and Lakebase assumptions; Photon multiplier; region factors; promotion windows | Human review. A workflow may open a PR later; it does not silently rewrite DBU list prices. |
| `data/instances.json`    | Curated instances: cloud, id, family, vCPU, memory, DBU/hour, default on-demand $/hour                                                                                     | DBU/hour curated. `$/hour` overwritten by the refresh script when the API returns a match.  |
| `data/catalog-meta.json` | `version`, `verifiedOn`, disclaimer string                                                                                                                                 | Bumped when either file changes.                                                            |

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

Vite `base` is `/databricks-cost-forecaster/` so GitHub Pages project sites resolve assets. React Router, if used, uses that basename.

Visual direction: a forecasting desk, not a generic SaaS dashboard. Dark olive ink, warm paper, and a single copper accent for “money” figures. Display type is Fraunces (serif) for the forecast total; body is Source Sans 3. Charts are hand-built SVG (no chart library) so the bundle stays small and the forecast is readable without a legend hunt. Light and dark themes share the same tokens.

Layout:

1. Top bar: catalog version, cloud / region / tier, light-dark toggle, Share, Export.
2. Left: workload list and templates. Adding a workload opens a compact editor, not a new page.
3. Right: live month total (DBU vs cloud), annual run-rate, and the forecast chart. Sticky on desktop; stacked under the editor on small screens.
4. A second view, “Scenarios”, clones the portfolio twice and changes one lever (compute mode, Photon, commit, spot).
5. “Actuals” accepts a usage CSV and shows the scale it would apply.

State:

- Portfolio, scenarios, and forecast settings serialize to JSON.
- The URL hash holds a compressed payload (lz-string or a tiny equivalent) so a link restores the desk without a backend.
- Save/load uses that same JSON via download and a file input. Nothing is uploaded.

Accessibility: visible focus, labels on every input, contrast that holds in both themes, chart data also available as a table, no information by color alone.

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
