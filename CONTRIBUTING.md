# Contributing

Changes to rates need a source and a date. Changes to the page should keep the forecast, the tests, and the accessibility checks green.

## Local setup

```bash
npm install
npm test
npm run dev
```

The site is at http://localhost:5173/databricks-cost-forecaster/.

Before a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:mcp
npm run test:e2e
```

Playwright downloads Chromium on first run: `npx playwright install chromium`.

## Pricing data

DBU list rates live in `data/sku-rates.json`. Change one only with a source and a date in `docs/RESEARCH.md`, then bump `version` and `verifiedOn`. Do not silently rewrite list rates from a scraper.

Instance DBU/hour values live in `data/instances.json`. VM dollars live in `data/cloud-vm-prices.json`. Azure regional DBU meters live in `data/azure-dbu-meters.json`. Refresh those three with:

```bash
npm run refresh-prices
```

That calls the Azure Retail Prices API, the public AWS offer files, and the Databricks Labs instance-rating table. It does not change `data/sku-rates.json`. GCP virtual-machine rows stay seeded until `GCP_BILLING_API_KEY` is set; do not commit a key. See `docs/DATA-PIPELINE.md`.

The pricing math belongs in `packages/engine`. The site and the MCP server both call it. Add a unit test for any new rule, especially anything that must not discount the wrong line (spot versus DBU, Photon versus SQL, commit versus spot).

## MCP server

```bash
npm run build
node mcp/dist/index.js
```

Point an MCP client at that file over stdio. See the README.

## Design

Keep pricing in a strategy or a policy, not in a component. New controls need a visible label, a keyboard path, and a check in both themes. Totals stay estimates, and the catalog version stays on the page. `npm run lint` runs ESLint and Prettier.
