# Security

Cayfore is an independent estimate. It does not log into a Databricks workspace, and the public site does not send the forecast anywhere.

## Reporting a vulnerability

Please use [private vulnerability reporting](https://github.com/santoshshinde2012/cayfore/security/advisories/new). Include the affected path, what an attacker can do, and a suggested fix if you have one. Do not open a public issue for a vulnerability, and do not include a personal access token, a customer invoice, or a contract.

We will acknowledge a report within 7 days and aim to ship a fix or a documented mitigation within 30 days when the issue is in this repository.

## What this repository protects

- A usage CSV or a forecast JSON file is untrusted. The browser and the MCP server cap the size and the row count, parse JSON without prototype keys, and check the shape with zod before the engine uses it.
- CSV export prefixes cells that spreadsheets would treat as formulas. PDF export writes plain text and strips control characters.
- A share link is a compressed JSON document in the URL hash. It is length-capped and parsed as plain data. The only browser storage is `cayfore-theme`, and that value is `light` or `dark`.
- The production page sets a Content-Security-Policy meta tag. Scripts are hashed. There is no `unsafe-eval` and no third-party tracker. Fonts and scripts are served with the page. Styles keep `unsafe-inline` because the page sets style attributes and the animation library inserts style tags. A hash on those tags would block them.
- `frame-ancestors` cannot be set from a meta tag, and GitHub Pages does not let this repository set response headers. A host in front of Pages can send `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- The CLI and the MCP server do not call a workspace. `docs/usage-export.sql` is a fixed `SELECT` on `system.billing.usage` and `system.billing.list_prices`. Run it as a principal that can `USE CATALOG system`, `USE SCHEMA billing`, and `SELECT` on those two tables. Do not grant modify or create.
- If a workspace client is added later, it must use `scripts/workspace-host.mjs`: HTTPS only, a Databricks workspace hostname, no credentials in the URL, a 30 second timeout, and `DATABRICKS_HOST` plus `DATABRICKS_TOKEN` from the environment. The token must not be logged or written to disk.
- Price refresh fetches only an allow-listed set of HTTPS hosts, refuses redirects, and redacts API keys in errors.

## Dependencies and releases

`npm audit` covers the root lockfile, including dev dependencies and every workspace. OSV-Scanner, Gitleaks, Semgrep, and CodeQL run in GitHub Actions. The release workflow attaches a CycloneDX SBOM to the GitHub release.

The packages are `private` and are not published to the npm registry. If one is published later, publish with `npm publish --provenance` and `id-token: write` on that job. Provenance is not attached today because nothing is published.

## Branch protection

These settings are recommended for `main`. They are repository settings, not files in this pull request.

- Require a pull request before merging.
- Require the CI, CodeQL, Security, and Scorecard checks to pass.
- Require signed commits if the repository already uses them.
- Do not allow force-pushes or deletions.
- Keep Dependabot security updates and secret scanning push protection enabled.
- Give Actions the default `GITHUB_TOKEN` of read access to contents, and grant write only in the workflow that needs it.
