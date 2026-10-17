# Cayfore

A browser-local Databricks budget and scenario planner, with a 12-month cost forecast.

[![License: MIT](https://img.shields.io/badge/license-MIT-111111)](LICENSE)
[![Node 22.13+](https://img.shields.io/badge/node-22.13%2B-111111)](package.json)
[![Live site](https://img.shields.io/badge/live-GitHub%20Pages-111111)](https://santoshshinde2012.github.io/cayfore/)

Cayfore is the interface. This repository is the forecast. It is an estimate, not a quote, and it is not affiliated with Databricks. The calculation stays in the browser. See [docs/PRIVACY.md](docs/PRIVACY.md).

![Cayfore on a wide screen: quick inputs and a year total with a planning range](docs/screenshots/forecast-light.png)

## What it answers

Cloud and tier, a starting monthly amount or a team size, a mix of pipelines, dashboards, and models, and monthly growth. The page returns a low-to-high year, a sentence, a chart, and a month table.

| Input          | Default                                          |
| -------------- | ------------------------------------------------ |
| Cloud and tier | AWS, Premium, reference region                   |
| Starting point | Medium, $12,000 a month                          |
| Mix            | 45% pipelines, 40% dashboards, 15% models        |
| Growth         | 3% a month, with an optional commitment discount |

On that default the page reads **about $170,258 per year, ±20%**. First month **$11,997**. **29%** of the bill is cloud machines. The sources for the presets and the rates are in [docs/RESEARCH.md](docs/RESEARCH.md).

A usage CSV opens a review of its baseline month, prices, and gaps before replacing the estimate. Databricks billing and recognized FOCUS files are supported. Imported monetary costs stay observed costs; the app does not invent a separate VM bill. See [usage import](docs/USAGE-IMPORT.md).

Set an annual budget, save named scenarios, and plan dated launches or retirements. Charts show observed spend, future estimates, budget variance, scenario comparisons, and monthly cost components. Advanced opens the per-workload editor. Growth and pricing controls preserve those workloads.

![Imported spend and forecast against a budget, using the bundled historical demonstration CSV](docs/screenshots/usage-forecast.png)

CSV, JSON, PDF, and shared plans use the same forecast result. Unpriced charges are identified as unresolved; the total is a known subtotal when costs are missing. The range represents planning assumptions, not a calibrated probability interval.

![The same forecast in dark mode](docs/screenshots/forecast-dark.png)

![The forecast on a narrow screen, with the year total pinned](docs/screenshots/mobile-light.png)

![The same narrow screen in dark mode](docs/screenshots/mobile-dark.png)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173/cayfore/

Use Node 22.13+ within Node 22, or Node 24+. Run `nvm use` to select Node 22 from `.nvmrc`.

```bash
npm test          # engine unit tests and the price-file parser
npm run lint
npm run typecheck
npm run build
npm run test:mcp  # stdio MCP smoke test
npm run test:e2e  # Playwright, desktop and mobile, including axe
```

The core JavaScript is about 287 KB gzipped, including the separately cached price catalog. Charts, PDF, and Excel export load in separate chunks. CSS is about 10 KB gzipped, before the font files.

## Repository

| Path                         | Role                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- |
| `packages/engine`            | Pricing, the four-input forecast, scenarios, and usage import           |
| `packages/sheet`             | Excel workbook export. Loaded only when someone exports                 |
| `data/`                      | Versioned rates, instance ratings, and virtual-machine prices           |
| `apps/web`                   | The forecast page                                                       |
| `mcp/`                       | The stdio server over the same engine                                   |
| `scripts/weekly-catalog.ts`  | Monday catalog and price check. Dry-run by default                      |
| `scripts/refresh-prices.mjs` | VM and Azure DBU meter refresh. Instance DBU counts stay cited.         |
| `docs/DATA-PIPELINE.md`      | Where those prices come from, and how the weekly job runs               |
| `docs/CATALOG.md`            | Product catalog schema, citations, and the watch                        |
| `docs/PRODUCTS.md`           | Product inventory and which rows have a list rate                       |
| `docs/COVERAGE.md`           | Which products and Azure cells have a cited rate                        |
| `docs/RESEARCH.md`           | Source for every rate                                                   |
| `docs/NAMING.md`             | Why the product is called Cayfore                                       |
| `docs/ARCHITECTURE.md`       | How the pricing code is split                                           |
| `docs/USABILITY.md`          | Walkthroughs for evaluating, budgeting, and a usage file                |
| `docs/USAGE-IMPORT.md`       | Typed import, period selection, currencies, corrections, and cost basis |
| `docs/PLAN.md`               | What the page covers, and what the engine still prices                  |
| `docs/ROADMAP.md`            | Gaps versus other calculators, and what is not in this pass             |
| `docs/PRIVACY.md`            | What stays in the browser                                               |
| `docs/FAQ.md`                | Short answers for the public FAQ page                                   |
| `docs/MCP.md`                | Tool arguments and a client config                                      |
| `docs/MAINTENANCE.md`        | How dependency updates are grouped                                      |
| `SECURITY.md`                | How to report a vulnerability                                           |
| `CHANGELOG.md`               | What is unreleased. GitHub Releases are cut by the owner                |
| `NOTICE`                     | License notice for the code and the price sources                       |

## Publish

Pushes to `main` publish the site from `.github/workflows/pages.yml`. The address is https://santoshshinde2012.github.io/cayfore/

Vite’s base path is `/cayfore/`. Unknown addresses serve `404.html`. The repository social-preview image is `.github/social-preview.png` (1280×640). Upload that file in the repository settings if GitHub has not picked it up. Topics and the description belong on the repository, not in the page.

One weekly workflow, Mondays at 06:00 UTC, refreshes AWS and Azure list prices and checks allowed Databricks metadata for new or renamed products. It opens a single review pull request and does not merge. GCP virtual-machine rates stay seeded unless `GCP_BILLING_API_KEY` is set. Do not commit that key. The curated $/DBU table is not rewritten. The forecast page prints `Prices updated on <date>, catalog vX`. Details are in [docs/DATA-PIPELINE.md](docs/DATA-PIPELINE.md).

## MCP

`mcp/` speaks stdio and does not log into a workspace. A browser page cannot call the Databricks SQL API. Tools: `list_skus`, `list_products`, `estimate_workload`, `estimate_product`, `forecast`, `compare_scenarios`, `forecast_usage`, and `export_xlsx`. `npm run cayfore -- estimate --xlsx forecast.xlsx` writes the same Excel workbook the page downloads.

```bash
npm run build
node mcp/dist/index.js
```

Arguments, a client config, and the fixture numbers are in [docs/MCP.md](docs/MCP.md).

## License

[MIT](LICENSE). Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing a rate.
