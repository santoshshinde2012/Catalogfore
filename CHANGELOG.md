# Changelog

There is no GitHub Release yet. The owner publishes those. Dates below are the catalog day, not a support window.

## Unreleased

### Added

- A confidence score on every product and on every cloud, region, tier, and SKU cell (`data/rate-confidence.json`). Azure meters score as measured. The US East card scores as secondary. Other AWS and GCP regions stay on the Lakehouse Real-Time proxy.
- Zerobus Ingest at the secondary list: $0.050/GB on AWS Premium and $0.064/GB on AWS Enterprise and Azure. The example is 100 GB. GCP stays at $0. The undated launch promotion is not applied.
- Layer checks (`dependency-cruiser`), an engine coverage threshold, CodeQL, Dependabot, CODEOWNERS, pinned GitHub Action SHAs, and a semver release workflow that reads CHANGELOG.md.
- A versioned product catalog (`data/product-catalog.json`, `@cayfore/catalog`) covering Databricks products as of 2026-10-16. A row with a published rate or a documented underlying SKU is priced. A row with nothing billable stays at $0 and says so.
- Usage-based estimators for Genie, Genie Code, AI/BI dashboards, and `ai_parse_document`. Allowance math follows the docs. DBU per question and DBU per refresh are labeled assumptions.
- A usage CSV import that maps `sku_name` onto every catalog product it can, with `docs/usage-export.sql` and a Databricks notebook at `docs/cayfore-usage.py`.
- A coverage report (`docs/COVERAGE.md`) for products and for Azure region-and-SKU cells. The same sentence is in “How we got this”.
- Advanced “Add product”, grouped by category, with schema-driven inputs for products that do not have their own editor.
- Per-product month and 12-month totals in Advanced.
- MCP tools `list_products` and `estimate_product`, and CLI commands `products` and `product <id>`.
- A Monday catalog watch that flags unknown Azure meters, stale manual citations, and possible new billable features from the Databricks RSS feed.
- A 12-month forecast from cloud, starting amount, workload mix, and growth, with a low-to-high band.
- Usage CSV import. One month sets the run rate. Six or more months fit a trend. The sample files are in `apps/web/public/`.
- CSV, JSON, and PDF export, and a share link that keeps the plan in the URL.
- CLI (`npm run cayfore`) and a stdio MCP server with the same engine.
- Weekly price refresh for AWS on-demand rates and Azure VM and DBU meters. See `docs/DATA-PIPELINE.md`.
- `robots.txt`, a sitemap, a web manifest, and JSON-LD (`WebSite`, `WebApplication`, `SoftwareApplication`) on the production page.
- A static FAQ at `/faq.html` and `docs/FAQ.md`. The forecast page layout is unchanged.
- A production Content-Security-Policy meta tag and a referrer policy. See `docs/ROADMAP.md` for what GitHub Pages cannot set.
- Optional Plausible analytics, off unless `VITE_PLAUSIBLE_DOMAIN` is set at build time. Removed in the security pass below. The page no longer has a path that loads it.
- Issue forms, a pull request template, and `NOTICE` for the price sources.
- `docs/PRIVACY.md`. The calculation stays in the browser.

### Changed

- Uploads, share links, and forecast JSON are size-capped and parsed as plain data. CSV export neutralizes spreadsheet formulas. The production page does not load a third-party script. The unused `@radix-ui/react-label` package is removed. Dependabot waits 7 days before opening a version-update pull request.
- Price refresh and catalog watch fetch only allow-listed HTTPS hosts. The billing SQL stays a fixed `SELECT`.
- The product name is Cayfore. The theme is stored as `cayfore-theme`. A browser that still has `dcf-theme` is copied once, then the old key is removed.
- The GitHub repository, the Pages path, and the root package are `cayfore` (https://santoshshinde2012.github.io/cayfore/). They were previously `databricks-cost-forecaster`.
- Instance DBU counts are a cited table. Azure rows that Microsoft publishes are cited to the Azure Databricks pricing page. AWS, GCP, and `Standard_F4s_v2` stay manual. The refresh does not download LakeMeter-OSS.
