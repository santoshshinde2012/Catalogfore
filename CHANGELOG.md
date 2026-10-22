# Changelog

Unreleased changes are listed below. Catalog dates describe bundled data, not a support window or release publication.

## Unreleased

### Added

- Task-based documentation index, CLI and development guides, production verification commands, and consistent help for input paths, budget scenarios, rate evidence, saving and sharing. Authored Markdown local file links are checked in CI and Pages builds.

- Monthly quantity planning from Unit costs, with whole-plan first-month and annual previews, proportional updates to matching workloads, explicit application limits and pricing restrictions, and persistent View forecast / Undo change actions. Preview, applied forecast, and exports use the same engine.

- The product name is Catalogfore. The GitHub repository and Pages site are [Catalogfore](https://github.com/santoshshinde2012/Catalogfore) and https://santoshshinde2012.github.io/Catalogfore/. The npm scope and `cayfore-theme` key stay `cayfore`. Excel downloads use `catalogfore-forecast-*.xlsx`.

- A sortable, paginated unit-cost data preview with quoted billing units, source evidence and dates, exact-row inspection, and matching CSV/JSON export scope. Files retain all 40 fields and every selected row; pagination only limits the preview.

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

- A confidence score on every product and on every cloud, region, tier, and SKU cell (`data/generated/rate-confidence.json`). Exact Azure meters and qualified captured Databricks regional observations take precedence; reference bases and regional factors remain labeled fallbacks. Scores describe evidence quality, not probabilities.
- Zerobus Ingest at the captured official US East list: $0.050/GB on AWS Premium and $0.064/GB on AWS Enterprise and Azure. The example is 100 GB. GCP remains unresolved. The undated launch promotion is not applied.
- Layer checks (`dependency-cruiser`), an engine coverage threshold, CodeQL, Dependabot, CODEOWNERS, pinned GitHub Action SHAs, and a semver release workflow that reads CHANGELOG.md.
- A versioned product catalog (`data/product-catalog.json`, `@cayfore/catalog`) with billing units, sources and workload templates. Published rates and documented underlying SKUs contribute priced costs. Missing rates remain unresolved and excluded from known subtotals; zero requires explicit evidence.
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

- Dismissible notifications stay clear of workspace navigation and the mobile/tablet forecast shortcut, including device safe areas.

- Browser usage loading preserves injected fetch and notification dependencies. CLI saved-plan input accepts the supported 8,000,000-character file limit. MCP product estimates describe missing prices as unresolved and expose incomplete coverage instead of implying a free product.

- Production controls wait for session startup before accepting input, and CI runs the full browser suite against the built app. Touch field help, drag cancellation, short-screen keyboard help, menu focus, and dark-theme printing now have regression coverage.
- Long fitted forecasts retain all 36 months when reopened. Product forecasts apply dated events once, preserve signed corrections, and allocate add-ons only to eligible charges. Excel annual totals cover the first 12 months, detailed growth matches the engine, and overlapping savings alternatives are not added together.
- Large saved-scenario collections and supported forecast uploads reopen within their advertised limits. Plans too large for a share link keep their active state and offer JSON export; invalid sample responses report a failure.
- Connection status now hydrates consistently with the static landing page. Failed route downloads retry through a reload that keeps the forecast URL, and catalog build failures reach the recovery screen.
- Rate exports wait for the selected filters, completed exports preserve focus in another control, and keyboard help returns focus to its trigger. Workspace shortcuts respect open dialogs and support macOS Option keys.
- Advanced inputs now validate committed drafts, preserve spaces in workload names, keep contract provenance during edits, and reject inverted worker ranges. Workload cloud changes select compatible machines; imported placement stays tied to its source.
- Import cancellation restores keyboard focus, nested upload failures stay visible in Advanced, and corrected saved files clear stale errors. Delayed file reads cannot overwrite a later selection or a new forecast. Every forecast export handles failed downloads and restores keyboard focus after preparation.
- Catalog search reset and pagination restore useful keyboard focus. Calculator feedback and Undo appear beside the action; Downloads retains scope, sort, page size, and page across workspace navigation.
- Incomplete saved-scenario comparisons and Advanced totals disclose unresolved charges. Commitment input limits prevent calculation crashes, and failed workspace loads provide recovery actions while retaining navigation and the forecast URL.
- README setup and planning examples now explain supported Node versions, portable JSON backups, browser-only scenarios, catalog versions, and the actual asymmetric planning range.
- Product map and Unit costs retain browsing filters, selections, tabs, and quantity drafts when switching workspaces. Rate placement filters stay in the URL, and forecast previews appear before the apply action.
- Budget and discount drafts validate before changing a forecast. Budget, discount, spend, and growth fields follow the active plan after loading, resetting, or undoing changes. Calendar and timeline edits preserve quick inputs; Undo restores the latest change. Saved-scenario deletion can be undone, with a nearby warning when browser storage cannot persist a save.
- Forecast and budget summaries identify unresolved charges across the entire forecast, and annual copy states the actual low-to-high planning range. A shortcut opens budget and scenario controls directly from the results.
- Adding a product preserves its template machine when supported by the active cloud, keeping Advanced and Product map results consistent with the documented examples.

- Weekly catalog check on 2026-10-19. Catalog version 2026-10-17.3 -> 2026-10-19.1.
- Weekly report generation runs after the catalog version changes so the product inventory and generated reports describe the same snapshot. Refresh-sensitive tests compare against source observations instead of a fixed capture date.
- Each price file now has one engine loader under `packages/engine/src/catalog/sources`. Excel reads cell confidence through `@cayfore/engine/rate-confidence`. Rebuilt reports and unit-cost artifacts live in `data/generated/`, apart from the catalogs that are edited by hand.
- Removed boxed header and unit-cost task navigation in favor of plain text and active underlines. Compacted the reference filters and source context to give catalog data more room.

- Fixed literal release-note selection, single-pass RSS entity decoding, bounded share decompression, and additional CSV formula prefixes. Added deterministic property-based fuzz tests, refreshed security-policy accuracy, and enabled trusted scheduled Scorecard publication. Recorded and applied the repository's PR/CI branch-protection baseline; independent review, project-age and badge criteria remain explicit maintainer follow-ups.

- Simplified the header to three primary workspaces and one grouped Menu. A custom forecast mark, centered navigation, clear active states, 44px controls and aligned mobile/desktop offsets replace the crowded toolbar. File opening, theme selection, keyboard focus and touch explanations remain available from the menu.

- Redesigned the three workspaces around their main tasks: visible mobile navigation, early usage/import entry points, sticky desktop forecasts, immediate product search and domain filters, and unit-cost tabs with persistent calculator/export choices. Refined spacing, typography, source actions and narrow-screen layouts. Help remains hoverable and closes reliably after pointer exit on slower devices.

- One injectable DBU quote policy now supplies forecasts, unit costs, source provenance and Excel. Reviewed native prices and consumption conversions share one registry. Public Azure reference components outside East US, Zerobus outside its US East reference scope, conflicted GTE capacity, and unpublished defaults remain unresolved; independently supplied costs retain custom provenance through editing and reopening.

- Excel source-rate sheets resolve each workload's placement and regional meter, preserve separate same-SKU workloads, and explain custom or observed costs without assigning an unrelated public DBU rate. Unit-cost evidence distinguishes old observations, documentation reviews, assumptions, and current source conflicts; validated first-party prices now take precedence across the shared forecast, CLI, unit-cost catalog and Excel resolver, while consumption assumptions remain labeled.
- Catalog refresh on 2026-10-17. Catalog `2026-10-17.1`, price book `2026-10-17.1`, instances `2026-10-17.1`, and the VM and Azure meter files `2026-10-17.2`. Azure Retail Prices and AWS EC2 offers were re-read. No list rate moved. GCP was skipped. Multi-statement transactions are generally available and are not a new SKU. The default medium AWS year stays $170,257.52.
- Page, CSV, JSON, PDF, product totals, recommendations, CLI, and MCP share one canonical dated forecast. Promotions are evaluated per month, fitted forecasts retain calendar spacing, and zero periods remain observations.
- Global growth and pricing changes preserve detailed workloads. Internal navigation preserves shared state. Every savings action applies the change it quotes, with alternatives labelled as overlapping comparisons.
- Node 22.13+ within Node 22, or Node 24+, is required; `.nvmrc` and workflows select Node 22. Ownership summaries are omitted from shared URLs and remain available in local scenarios and JSON downloads.

- Uploads, share links, and forecast JSON are size-capped and parsed as plain data. CSV export neutralizes spreadsheet formulas. The production page does not load a third-party script. The unused `@radix-ui/react-label` package is removed. Dependabot waits 7 days before opening a version-update pull request.
- Price refresh and catalog watch fetch only allow-listed HTTPS hosts. The billing SQL stays a fixed `SELECT`.
- The product name is Cayfore. The theme is stored as `cayfore-theme`. A browser that still has `dcf-theme` is copied once, then the old key is removed.
- The GitHub repository, the Pages path, and the root package were `cayfore` (https://santoshshinde2012.github.io/cayfore/). They were previously `databricks-cost-forecaster`.
- Instance DBU counts are a cited table. Azure rows that Microsoft publishes are cited to the Azure Databricks pricing page. AWS, GCP, and `Standard_F4s_v2` stay manual. The refresh does not download LakeMeter-OSS.
