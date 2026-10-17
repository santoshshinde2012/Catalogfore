# Changelog

There is no GitHub Release yet. The owner publishes those. Dates below are the catalog day, not a support window.

## Unreleased

### Added

- Regional unit-cost comparison bars, a source-to-component calculation path, and an evidence-coverage visualization, all driven by shared engine analytics. Comparisons keep identical units, configurations and editions; unresolved amounts never become zero bars.

- Captured first-party Databricks price-card and calculator data, hashed original responses, replayable source validation, and explicit source conflicts. Unit costs now shows evidence filters, scoped coverage counts, publisher links beside prices, and separate observation/review dates.

- A separate Unit costs explorer and deterministic source CSV/JSON catalog for all 70 pricing products and eight platform concepts. Prices retain their cloud, region, edition, component, variant, units, conversion factors, source evidence, conditions, and unresolved coverage. Product map and forecast lines open reference costs; a quantity calculator shows component subtotals. Complete exports are versioned losslessly compressed and checked against the builder in CI.
- `cayfore rates` for filtered CSV/JSON source-price exports, plus `export:unit-costs` and `check:unit-costs` commands. The weekly catalog workflow rebuilds both artifacts after price updates.
- A separate Product map with eight learning domains, all 70 catalog entries, eight platform concepts, searchable current and legacy names, sourced relationships, and example architectures. Supported products append to the existing forecast with Undo; navigation and browser history preserve the saved plan.
- An Excel workbook export (XLSX) from the Export menu, `cayfore estimate --xlsx`, and the MCP tool `export_xlsx`. CSV, JSON, and PDF stay. The workbook uses live `SUM` formulas, the lava header, and the disclaimer “Not affiliated with Databricks”.
- One Monday 06:00 UTC catalog workflow. It refreshes Azure and AWS list prices, checks allowed Databricks RSS and sitemap metadata, validates the schema, flags rate moves over 20%, and opens one review pull request. It does not merge.

- A refined planning header, contextual tooltips for navigation and chart controls, and descriptive workspace/export menus with keyboard and touch support.
- Complete mobile and keyboard planning flows: forecast shortcuts, balanced chart tabs, persistent import actions, accessible scrolling tables, explicit reset/undo, validated input drafts, editor focus management, and responsive planning states.
- Local budget and named-scenario planning, dated usage changes, contract-rate provenance, and a commitment break-even what-if including unused value and overage.
- Dated observed-history/forecast charts, cumulative budget comparison, saved-scenario overlays, stacked cost components, explicit planning ranges, and reconciled month tables.
- Shared typed Databricks and FOCUS cost imports with preview, closed-month defaults, explicit partial periods, effective-list pricing, signed corrections, duplicate detection, USD validation, and local attribution.
- Runtime price status and source context, saved price-book references, strict saved-file validation, and financial workflow regressions across engine, CLI, MCP, and desktop/mobile browsers.

- A confidence score on every product and on every cloud, region, tier, and SKU cell (`data/rate-confidence.json`). Azure meters score as measured. The US East card scores as secondary. Other AWS and GCP regions stay on the Lakehouse Real-Time proxy.
- Zerobus Ingest at the captured official US East list: $0.050/GB on AWS Premium and $0.064/GB on AWS Enterprise and Azure. The example is 100 GB. GCP remains unresolved. The undated launch promotion is not applied.
- Layer checks (`dependency-cruiser`), an engine coverage threshold, CodeQL, Dependabot, CODEOWNERS, pinned GitHub Action SHAs, and a semver release workflow that reads CHANGELOG.md.
- A versioned product catalog (`data/product-catalog.json`, `@cayfore/catalog`) covering Databricks products as of 2026-10-16. A row with a published rate or a documented underlying SKU is priced. A row with nothing billable stays at $0 and says so.
- Usage-based estimators for Genie, Genie Code, AI/BI dashboards, and `ai_parse_document`. Allowance math follows the docs. DBU per question and DBU per refresh are labeled assumptions.
- A usage CSV import that maps `sku_name` onto every catalog product it can, with `docs/usage-export.sql` and a Databricks notebook at `docs/cayfore-usage.py`.
- A coverage report (`docs/COVERAGE.md`) for products and for Azure region-and-SKU cells. The same sentence is in “How we got this”.
- Advanced “Add product”, grouped by category, with schema-driven inputs for products that do not have their own editor.
- Per-product month and 12-month totals in Advanced.
- MCP tools `list_products` and `estimate_product`, and CLI commands `products` and `product <id>`.
- A catalog watch that flags unknown Azure meters, stale manual citations, and possible new billable features from the Databricks RSS feed. It now runs inside the Monday weekly catalog workflow.
- A 12-month forecast from cloud, starting amount, workload mix, and growth, with a low-to-high band.
- Usage CSV import. One month sets the run rate. Six or more months fit a trend. The sample files are in `apps/web/public/`.
- CSV, JSON, and PDF export, and a share link that keeps the plan in the URL. Excel joined them later; see the first Added note.
- CLI (`npm run cayfore`) and a stdio MCP server with the same engine.
- Weekly price refresh for AWS on-demand rates and Azure VM and DBU meters, now part of the single Monday catalog workflow. See `docs/DATA-PIPELINE.md`.
- `robots.txt`, a sitemap, a web manifest, and JSON-LD (`WebSite`, `WebApplication`, `SoftwareApplication`) on the production page.
- A static FAQ at `/faq.html` and `docs/FAQ.md`. The forecast page layout is unchanged.
- A production Content-Security-Policy meta tag and a referrer policy. See `docs/ROADMAP.md` for what GitHub Pages cannot set.
- Optional Plausible analytics, off unless `VITE_PLAUSIBLE_DOMAIN` is set at build time. Removed in the security pass below. The page no longer has a path that loads it.
- Issue forms, a pull request template, and `NOTICE` for the price sources.
- `docs/PRIVACY.md`. The calculation stays in the browser.

### Changed

- One injectable DBU quote policy now supplies forecasts, unit costs, source provenance and Excel. Reviewed native prices and consumption conversions share one registry. Public Azure reference components outside East US, Zerobus outside its US East reference scope, conflicted GTE capacity, and unpublished defaults remain unresolved; independently supplied costs retain custom provenance through editing and reopening.

- Excel source-rate sheets resolve each workload's placement and regional meter, preserve separate same-SKU workloads, and explain custom or observed costs without assigning an unrelated public DBU rate. Unit-cost evidence distinguishes old observations, documentation reviews, assumptions, and current source conflicts; validated first-party prices now take precedence across the shared forecast, CLI, unit-cost catalog and Excel resolver, while consumption assumptions remain labeled.
- Catalog refresh on 2026-10-17. Catalog `2026-10-17.1`, price book `2026-10-17.1`, instances `2026-10-17.1`, and the VM and Azure meter files `2026-10-17.2`. Azure Retail Prices and AWS EC2 offers were re-read. No list rate moved. GCP was skipped. Multi-statement transactions are generally available and are not a new SKU. The default medium AWS year stays $170,257.52.
- Page, CSV, JSON, PDF, product totals, recommendations, CLI, and MCP share one canonical dated forecast. Promotions are evaluated per month, fitted forecasts retain calendar spacing, and zero periods remain observations.
- Global growth and pricing changes preserve detailed workloads. Internal navigation preserves shared state. Every savings action applies the change it quotes, with alternatives labelled as overlapping comparisons.
- Node 22.13+ within Node 22, or Node 24+, is required; `.nvmrc` and workflows select Node 22. Ownership summaries are omitted from shared URLs and remain available in local scenarios and JSON downloads.

- Uploads, share links, and forecast JSON are size-capped and parsed as plain data. CSV export neutralizes spreadsheet formulas. The production page does not load a third-party script. The unused `@radix-ui/react-label` package is removed. Dependabot waits 7 days before opening a version-update pull request.
- Price refresh and catalog watch fetch only allow-listed HTTPS hosts. The billing SQL stays a fixed `SELECT`.
- The product name is Cayfore. The theme is stored as `cayfore-theme`. A browser that still has `dcf-theme` is copied once, then the old key is removed.
- The GitHub repository, the Pages path, and the root package are `cayfore` (https://santoshshinde2012.github.io/cayfore/). They were previously `databricks-cost-forecaster`.
- Instance DBU counts are a cited table. Azure rows that Microsoft publishes are cited to the Azure Databricks pricing page. AWS, GCP, and `Standard_F4s_v2` stay manual. The refresh does not download LakeMeter-OSS.
