# Changelog

There is no GitHub Release yet. The owner publishes those. Dates below are the catalog day, not a support window.

## Unreleased

### Added

- A 12-month forecast from cloud, starting amount, workload mix, and growth, with a low-to-high band.
- Usage CSV import. One month sets the run rate. Six or more months fit a trend. The sample files are in `apps/web/public/`.
- CSV, JSON, and PDF export, and a share link that keeps the plan in the URL.
- CLI (`npm run cayfore`) and a stdio MCP server with the same engine.
- Weekly price refresh for AWS on-demand rates and Azure VM and DBU meters. See `docs/DATA-PIPELINE.md`.
- `robots.txt`, a sitemap, a web manifest, and JSON-LD (`WebSite`, `WebApplication`, `SoftwareApplication`) on the production page.
- A static FAQ at `/faq.html` and `docs/FAQ.md`. The forecast page layout is unchanged.
- A production Content-Security-Policy meta tag and a referrer policy. See `docs/ROADMAP.md` for what GitHub Pages cannot set.
- Optional Plausible analytics, off unless `VITE_PLAUSIBLE_DOMAIN` is set at build time.
- Issue forms, a pull request template, and `NOTICE` for the price sources.
- `docs/PRIVACY.md`. The calculation stays in the browser.

### Changed

- The product name is Cayfore. The theme key stays `dcf-theme`.
- The GitHub repository, the Pages path, and the root package are `cayfore` (https://santoshshinde2012.github.io/cayfore/). They were previously `databricks-cost-forecaster`.
- Instance DBU counts are a cited table. Azure rows that Microsoft publishes are cited to the Azure Databricks pricing page. AWS, GCP, and `Standard_F4s_v2` stay manual. The refresh does not download LakeMeter-OSS.
