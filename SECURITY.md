# Security

Catalogfore is an independent estimate. It does not log into a Databricks workspace, and the public site does not send the forecast anywhere.

## Reporting a vulnerability

Please use [private vulnerability reporting](https://github.com/santoshshinde2012/Catalogfore/security/advisories/new). Include the affected path, what an attacker can do, and a suggested fix if you have one. Do not open a public issue for a vulnerability, and do not include a personal access token, a customer invoice, or a contract.

We will acknowledge a report within 7 days and aim to ship a fix or a documented mitigation within 30 days when the issue is in this repository.

## What this repository protects

- A usage CSV or a forecast JSON file is untrusted. The browser and the MCP server cap the size and the row count, parse JSON without prototype keys, and check the shape with zod before the engine uses it.
- Spreadsheet exports prefix known formula-triggering text, including control and full-width prefixes, and CSV fields are quoted. Spreadsheet software can remove escaping when a CSV is re-saved; see the [security review](docs/SECURITY-REVIEW.md) for the limits of this defense. PDF export writes plain text and strips control characters.
- A share link is a compressed JSON document in the URL hash. It is length-capped and parsed as plain data. Browser storage contains the `cayfore-theme` preference and any named scenarios the user saves under `cayfore:scenarios:v1`. Saved scenarios include plan inputs, monthly usage summaries and any imported ownership summaries. Delete them with the scenario's Delete button or clear the site's browser storage. See [Privacy](docs/PRIVACY.md) before sharing a plan or exported file.
- The production page sets a Content-Security-Policy meta tag. Inline scripts are authorized by hashes; external JavaScript modules are allowed from the same origin. There is no `unsafe-eval` and no third-party tracker. Fonts and scripts are served with the page. Styles keep `unsafe-inline` because the page sets style attributes and the animation library inserts style tags. A hash on those tags would block them.
- `frame-ancestors` cannot be set from a meta tag, and GitHub Pages does not let this repository set response headers. A host in front of Pages can send `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- The CLI and the MCP server do not call a workspace. `docs/usage-export.sql` is a fixed `SELECT` on `system.billing.usage` and `system.billing.list_prices`. Run it as a principal that can `USE CATALOG system`, `USE SCHEMA billing`, and `SELECT` on those two tables. Do not grant modify or create.
- If a workspace client is added later, it must use `scripts/workspace-host.mjs`: HTTPS only, a Databricks workspace hostname, no credentials in the URL, a 30 second timeout, and `DATABRICKS_HOST` plus `DATABRICKS_TOKEN` from the environment. The token must not be logged or written to disk.
- Price refresh fetches only an allow-listed set of HTTPS hosts and redacts API keys in errors. Each followed redirect is bounded and revalidated against the same HTTPS, hostname and no-credentials rules; the AWS price stream refuses redirects.

## Dependencies and releases

`npm audit` covers the root lockfile, including dev dependencies and every workspace. OSV-Scanner, Gitleaks, Semgrep, and CodeQL run in GitHub Actions. The release workflow attaches a CycloneDX SBOM to the GitHub release.

The packages are `private` and are not published to the npm registry. If one is published later, publish with `npm publish --provenance` and `id-token: write` on that job. Provenance is not attached today because nothing is published.

## Branch protection

The reviewed baseline for `main` is versioned in [.github/branch-protection.json](.github/branch-protection.json) and was applied through GitHub's API. It requires pull requests, up-to-date CI and security checks, resolved conversations, and blocks force pushes and deletion, including for administrators. Independent human approval is not yet mandatory because the owner is currently the only collaborator. See the [security review](docs/SECURITY-REVIEW.md) for exact findings, verification and remaining maintainer actions.

Continue these practices and tighten review as the maintainer team grows:

- Require independent human approval before merging; AI review does not substitute for it.
- Require signed commits if the repository already uses them.
- Do not allow force-pushes or deletions.
- Keep Dependabot security updates and secret scanning push protection enabled.
- Give Actions the default `GITHUB_TOKEN` of read access to contents, and grant write only in the workflow that needs it.
