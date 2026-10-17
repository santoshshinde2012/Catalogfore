# MCP server

A local stdio server that estimates Databricks cost with the same engine as the website. It does not log into a workspace, and it does not read `system.billing.usage` unless you pass numbers in yourself.

Databricks’ own managed MCP servers (Genie, SQL, AI Search, Unity Catalog functions) are the right tool for live account data. They do not publish list prices. Use those for usage, and this server for the forecast.

## Run

```bash
npm install
npm run build
node mcp/dist/index.js
```

The GitHub Pages site cannot call a workspace. The SQL Statement API does not send `Access-Control-Allow-Origin` ([Databricks, CORS policy error](https://kb.databricks.com/security/cors-policy-error-when-trying-to-run-databricks-api-from-a-browser-based-application)), and a personal access token does not belong in browser JavaScript. This server does not read `DATABRICKS_TOKEN` and does not open a network connection. Export usage with `docs/usage-export.sql`, then pass the CSV to `forecast_usage` or to the shell.

The SQL file is a fixed `SELECT`. Run it with a principal that can read `system.billing.usage` and `system.billing.list_prices` and nothing else. A future client that does connect must take the host and token from the environment, accept only an HTTPS Databricks workspace host, time out after 30 seconds, and must not log the token. That check lives in `scripts/workspace-host.mjs`.

```bash
npm run cayfore
npm run cayfore -- usage apps/web/public/sample-usage-history.csv --cloud aws --as-of 2026-10-17
npm run cayfore -- forecast saved-plan.json
npm run cayfore -- estimate --xlsx forecast.xlsx
npm run cayfore -- sql
```

The process speaks MCP over stdin and stdout. A client config looks like this (use the absolute path on your machine):

```json
{
  "mcpServers": {
    "cayfore": {
      "command": "node",
      "args": ["/absolute/path/cayfore/mcp/dist/index.js"]
    }
  }
}
```

`npm run test:mcp` starts that binary, lists the tools, and checks a known classic-jobs estimate (DBU $53.82, cloud $99.84 on the fixture in the test script).

## Tools

Every response includes an estimates-only disclaimer and is JSON text.

### `list_skus`

Optional `cloud` (`aws`, `azure`, `gcp`, default `aws`) and `tier` (`premium` or `enterprise`, default `premium`).

Returns SKU labels, US East $/DBU, whether compute is included, the SQL DBU ladder, regions and their factors, curated instances with the reference-region VM price, foundation-model DBU rates, GPU serving DBU/hour, and the Photon multiplier.

Azure `enterprise` uses the same list rates as Azure Premium. The payload says so.

### `estimate_workload`

`portfolio` is a versioned saved portfolio or a shorthand object with an explicit `workloads` array. Unrelated objects such as `{}` are rejected. Versioned saves use the same strict validation as the website. Shorthand fills omitted settings with AWS, its reference region, Premium, and a flat 12-month forecast with 8% annual growth. Unsupported workload kinds fail validation.

A minimal classic job:

```json
{
  "portfolio": {
    "name": "Nightly",
    "cloud": "aws",
    "region": "us-east-1",
    "tier": "premium",
    "workloads": [
      {
        "id": "job",
        "name": "Nightly",
        "kind": "cluster",
        "sku": "jobs_classic",
        "instanceId": "m5.xlarge",
        "scale": { "min": 2, "max": 2, "utilization": 1 },
        "photon": false,
        "spotShare": 0,
        "spotDiscount": 0.6,
        "schedule": { "hoursPerDay": 8, "daysPerWeek": 5 }
      }
    ]
  }
}
```

That portfolio is the engine fixture: about $53.82 DBU and $99.84 cloud per month in US East Premium, before a region factor.

### `forecast`

Same `portfolio`. Returns the canonical monthly estimate, `forecast` points, `months` with planning ranges, annual total, coverage, and assumptions used by the website and its exports. Growth compounds monthly. Seasonality is `flat`, `retail`, or `custom` (12 weights). `forecast.startMonth` fixes the calendar start; dated `events` change usage from their effective month. Prices and product formulas are recomputed for each forecast month. A flat year with zero growth and no dated changes sums to twelve times the run rate.

### `compare_scenarios`

`portfolio`, plus optional `presets`:

| Preset               | What changes                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `as_modeled`         | The portfolio as given                                                                                |
| `jobs_serverless`    | Classic jobs and Lakeflow pipelines move to serverless, keeping monthly DBUs and dropping the VM line |
| `photon_on`          | Photon on classic clusters (2.9× DBU emission, same hours)                                            |
| `photon_speedup_2`   | Photon on, and hours cut in half. The speedup is an assumption, not a measurement                     |
| `spot_70`            | 70% of workers on spot                                                                                |
| `commit_37`          | 37% off the DBU line                                                                                  |
| `commit_37_cloud_30` | 37% off DBUs and 30% off on-demand VM hours                                                           |

The default comparison is `as_modeled`, `jobs_serverless`, and `commit_37`.

### `forecast_usage`

`csv` contains a Databricks system-billing or supported FOCUS CSV. Include `list_price` when the query joined `system.billing.list_prices` (`docs/usage-export.sql`). Optional arguments are `cloud` (fallback for rows without cloud), `tier`, `region`, `asOf` (`YYYY-MM-DD` reporting cutoff), `month` (`YYYY-MM` explicit baseline), and `costBasis` (`effective` or `billed`, for FOCUS).

The default baseline is the latest complete month. A partial month requires an explicit `month`; the response warns that it remains a partial run rate. The importer preserves exported USD costs, signed corrections, per-row cloud placement, unpriced quantities, and observed monthly history. Non-USD input fails with a conversion message. No separate cloud VM bill is inferred. Unknown prices remain visible through source and estimate coverage plus warnings.

Enough contiguous history can fit a trend; shorter histories use a run rate. Responses include `method`, `mape`, `selectedMonth`, `asOf`, `costBasis`, `sourceCoverage`, `estimateCoverage`, `warnings`, `assumptions`, `pricesUpdatedOn`, and the same canonical `forecast`, `months`, `annual`, and `band` as the website. Planning ranges are not calibrated probabilities. A fitted diagnostic on synthetic data is not evidence of customer forecast accuracy.

The CLI accepts the corresponding options as `--cloud`, `--tier`, `--region`, `--as-of`, `--month`, and `--cost-basis`. `forecast saved-plan.json` and `estimate saved-plan.json` reopen versioned JSON exports using strict validation. `estimate --xlsx forecast.xlsx` writes an Excel workbook for the default plan. `forecast saved-plan.json --xlsx forecast.xlsx` writes one for a saved plan.

### `export_xlsx`

Same `portfolio` as `forecast`. Returns `filename` (`cayfore-forecast-<cloud>-<YYYY-MM-DD>.xlsx`) and `workbookBase64`. The workbook has Summary, Monthly forecast, Breakdown, Products, Savings, and Rates sheets. Totals are Excel `SUM` formulas. It is an estimate, not a quote, and it says it is not affiliated with Databricks.

## What this server will not do

Time-limited product promotions apply only to eligible products and forecast dates in the bundled catalog. It will not invent a Photon speedup unless you pick `photon_speedup_2`. It will not treat an Azure Enterprise label as AWS Enterprise prices.
