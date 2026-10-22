# Catalogfore

Plan Databricks costs, compare scenarios, and inspect the evidence behind each rate.

[Open the planner](https://santoshshinde2012.github.io/Catalogfore/) · [Documentation](docs/README.md) · [FAQ](docs/FAQ.md) · [Contributing](CONTRIBUTING.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-111111)](LICENSE)
[![Node 22.13+ or 24+](https://img.shields.io/badge/node-22.13%2B%20or%2024%2B-111111)](package.json)

Catalogfore is an independent, browser-local budget and scenario planner. No account or workspace credentials are required. Calculations, billing-file imports, and downloads run locally. The bundled prices are dated snapshots; results are estimates, not Databricks quotes. [Privacy details](docs/PRIVACY.md)

![The planner with quick inputs, a forecast, and a planning range](docs/screenshots/forecast-light.png)

## Start with what you know

| Your starting point             | What to do                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A monthly budget or team size   | Open **Plan**. Choose cloud, region, and edition; set starting spend, workload mix, and monthly growth.                                                                  |
| A billing export                | Choose **Use my real usage**. Review the CSV's baseline month, cost basis, and missing prices, then choose **Use this baseline**. [Import guide](docs/USAGE-IMPORT.md)   |
| Specific products and schedules | Open **Advanced** to edit workloads, or use **Product map** to inspect and add a supported product. [Product map](docs/PRODUCT-MAP.md)                                   |
| A price or regional comparison  | Open **Unit costs**. Inspect the source, billing unit, evidence, and quantity calculation before applying a supported monthly quantity. [Unit costs](docs/UNIT-COSTS.md) |
| A saved plan                    | Choose **Menu → Open forecast** and select a forecast JSON file. CSV, XLSX, and PDF exports are reports, not editable-plan backups.                                      |

Review the first 12 months, the planning range, and any unresolved charges. Add an annual budget or dated usage changes under **Budget and scenarios**. Save a named baseline before exploring alternatives, then select it under **Compare current plan with**. [Guided examples](docs/USABILITY.md)

The bundled default is AWS Premium, a $12,000 starting monthly amount, a 45% pipelines / 40% dashboards / 15% models mix, and 3% monthly growth. Running `npm run --silent catalogfore -- estimate` currently returns **$11,996.70** for month one and **$170,257.52** for the first year. These are reproducible snapshot results, not promised future bills.

## Save and share your work

- **Save scenario** keeps a named plan in this browser, up to 20 scenarios. These do not sync across devices. A storage failure leaves saves available only for the current session.
- **Copy link** embeds the active plan in the URL fragment and omits ownership attribution summaries. Anyone receiving the link can inspect its inputs. Links recalculate against the app's installed price book.
- **Export → JSON** saves the active editable plan and its calculated report. It does not export the entire scenario collection. Open each scenario and export it separately to back up the collection.
- **XLSX, CSV, and PDF** report the same forecast result. The workbook's annual summary covers the first 12 months; its monthly sheet can include a longer saved forecast.

Plans that fit the share-link limits also restore from their URL after reload. If a plan is too large for a link, the app keeps it active, removes the stale plan fragment, and asks you to export JSON. Export before leaving or reloading. Browser storage and URL history are conveniences, not substitutes for a backup. [Storage and sharing](docs/PRIVACY.md)

## Understand the estimate

The quick planner sizes classic jobs, serverless SQL, and model-token workloads from your budget and mix. Advanced supports individual products and schedules. Imported monetary costs retain their cost basis; the importer does not invent a separate virtual-machine bill.

**Product map** explains domains, relationships, aliases, and billing context. **Unit costs** exposes the source-to-quote calculation, regional comparisons, evidence coverage, and CSV/JSON downloads. Download scope includes all selected rows; pagination does not limit the file. Reference browsing changes the forecast only when you explicitly add or update a supported quantity.

Keep these boundaries in mind:

- An unresolved price is excluded from the **known subtotal**; it is not a free service. A published rate does not establish regional availability or contract eligibility.
- Official observations, derived rates, planning estimates, and unresolved conflicts are labeled separately. A source review date does not make an old observation current.
- The planning range combines model and pricing assumptions. It is not a calibrated probability interval or evidence of customer forecast accuracy.
- Savings alternatives can overlap and must not be added together. A commitment what-if models the supplied terms, not a negotiated contract.
- Monetary imports and prices are in USD. Supported FOCUS columns do not imply full FOCUS dataset conformance.

[Pricing evidence](docs/UNIT-COSTS.md) · [Source research](docs/RESEARCH.md) · [Current behavior](docs/PLAN.md) · [Remaining work](docs/ROADMAP.md)

## Run locally

Use **Node 22.13+ within Node 22, or Node 24+**. Node 20 and 23 are outside the declared range. With nvm, `nvm install` and `nvm use` select Node 22 from [.nvmrc](.nvmrc).

From the repository root:

```sh
npm ci
npm run dev
```

Open [http://localhost:5173/Catalogfore/](http://localhost:5173/Catalogfore/). No `.env` file, Databricks token, or database is required for the planner.

```sh
npm run lint
npm run typecheck
npm run check:docs
npm run check:sources
npm run check:unit-costs
npm test
npm run build
npm run test:mcp
npx playwright install chromium
npm run test:e2e
```

By default, Playwright starts the development server. CI checks the built app, where CSP, prerendering, and lazy assets matter. [Development and production verification](docs/DEVELOPMENT.md) includes the exact preview commands and configuration settings.

## Use the CLI or MCP server

The command line and local stdio MCP server use the same engine and bundled data.

```sh
npm run --silent catalogfore -- estimate
npm run --silent catalogfore -- estimate --xlsx forecast.xlsx
npm run --silent catalogfore -- usage apps/web/public/sample-usage-history.csv --as-of 2026-10-17
npm run --silent catalogfore -- rates --product jobs_serverless --cloud aws --region us-east-1 --format csv
```

Use `--silent` when redirecting npm output to JSON or CSV. [CLI reference](docs/CLI.md) covers saved plans, usage cutoffs, rate filters, and artifact generation.

```sh
npm run build
node mcp/dist/index.js
```

The MCP process waits for a client on stdin/stdout; it is not an HTTP endpoint or a workspace connector. [MCP setup and tools](docs/MCP.md)

## How it is organized

| Path                                 | Responsibility                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| [apps/web](apps/web)                 | React workspaces, browser session state, imports, and downloads                    |
| [packages/engine](packages/engine)   | Cost strategies, dated projections, usage parsing, scenarios, and unit-cost policy |
| [packages/catalog](packages/catalog) | Validated product inventory and optional learning map                              |
| [packages/sheet](packages/sheet)     | Excel reports from the shared projection                                           |
| [mcp](mcp)                           | Local MCP tool adapters over the engine                                            |
| [data](data)                         | Versioned price inputs, retained source captures, and generated reports            |
| [scripts](scripts)                   | CLI, source refresh/replay, artifact generation, and verification                  |
| [docs](docs/README.md)               | User guides, implementation references, and source evidence                        |

Pricing belongs in the engine. Browser ports isolate capabilities used by application services; dependency checks prevent presentation code from importing price files directly. [Architecture and extension points](docs/ARCHITECTURE.md)

## Maintain and publish

Source refreshes are maintainer operations, separate from running the app. The weekly workflow is scheduled for Monday 06:00 UTC and prepares a review PR; it does not merge it. Offline source replay verifies retained captures and normalized values, not today's vendor prices. [Data pipeline](docs/DATA-PIPELINE.md)

The [Pages workflow](.github/workflows/pages.yml) builds and deploys `main`. The configured base path is `/Catalogfore/`. Deployment depends on repository Pages and Actions settings; a local build does not publish anything. [Deployment settings](docs/DEVELOPMENT.md#deployment)

[MIT license](LICENSE) · [Source attribution](NOTICE) · [Security reporting](SECURITY.md) · [Unreleased changes](CHANGELOG.md)
