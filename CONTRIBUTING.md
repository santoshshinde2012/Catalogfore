# Contributing

Changes to rates need a source and a date. Changes to the page should keep the forecast, the tests, and the accessibility checks green.

## Local setup

```bash
npm install
npm test
npm run dev
```

The site is at http://localhost:5173/Catalogfore/.

Before a pull request:

```bash
npm run lint
npm run typecheck
npm run check:sources
npm run check:unit-costs
npm test
npm run build
npm run test:mcp
npm run test:e2e
```

Playwright downloads Chromium on first run: `npx playwright install chromium`.

## Pricing data

Primary DBU observations live in `data/azure-dbu-meters.json` and `data/databricks-dbu-rates.json`; the shared engine resolver gives validated exact observations precedence. `npm run refresh:databricks` fetches fixed first-party price-card/calculator endpoints, retains raw compressed responses, and records accepted rows and exclusions. `npm run check:sources` replays those captures. Review currency, unit, cloud, edition, region, source locator, observation date and conflicting values before publishing a change. Keep source review dates separate from price observation and tariff effective dates. Rebuild the unit-cost artifacts and confidence/coverage reports after changes. Those outputs are written to `data/generated/` and are not edited by hand.

Legacy fallback DBU list rates live in `data/sku-rates.json`. Change one only with a source and a date in `docs/RESEARCH.md`, then bump `version` and `verifiedOn`. Do not silently rewrite list rates from a scraper.

Instance DBU/hour values live in `data/instances.json` and are a cited table. VM dollars live in `data/cloud-vm-prices.json`. Azure regional DBU meters live in `data/azure-dbu-meters.json`. Refresh the VM and meter files with:

```bash
npm run refresh-prices
```

That calls the Azure Retail Prices API and the public AWS offer files. It does not change `data/sku-rates.json` or `data/instances.json`. GCP virtual-machine rows stay seeded until `GCP_BILLING_API_KEY` is set; do not commit a key. See `docs/DATA-PIPELINE.md`.

The pricing math belongs in `packages/engine`. The site and the MCP server both call it. Add a unit test for any new rule, especially anything that must not discount the wrong line (spot versus DBU, Photon versus SQL, commit versus spot).

Bugs and rate questions have issue forms in `.github/ISSUE_TEMPLATE/`. A rate change needs a source and a date in `docs/RESEARCH.md`. Do not paste a contract, a customer invoice, or a personal access token.

`CHANGELOG.md` is the unreleased note. Publishing a GitHub Release is a maintainer step. `NOTICE` records the price sources. `docs/ROADMAP.md` is the list of gaps that are not in the page yet.

Routine npm and GitHub Actions updates share one weekly Dependabot PR. Keep dependency migrations coordinated with their peer requirements and supported Node versions. [Dependency maintenance](docs/MAINTENANCE.md) records the grouping policy and the consolidated upgrade decisions.

## MCP server

```bash
npm run build
node mcp/dist/index.js
```

Point an MCP client at that file over stdio. See the README.

## Design

Keep pricing in a strategy or a policy, not in a component. New controls need a visible label, a keyboard path, and a check in both themes. Totals stay estimates, and the catalog version stays on the page. `npm run lint` runs ESLint and Prettier.
