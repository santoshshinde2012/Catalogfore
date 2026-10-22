# MCP server

A local stdio server that estimates Databricks cost with the same engine as the website. It accepts supplied portfolio inputs or CSV text; it does not log into a workspace, query system tables, or fetch current prices. [Documentation index](README.md) · [CLI guide](CLI.md) · [Development setup](DEVELOPMENT.md)

## Run

```bash
npm ci
npm run build
node mcp/dist/index.js
```

Use the repository's supported Node version. The server waits for an MCP client; running it directly does not open a web interface. It does not read `DATABRICKS_TOKEN`. Export usage separately with [usage-export.sql](usage-export.sql), using an authorized principal that can read the named system tables, then supply the CSV text to `forecast_usage`. The [CLI guide](CLI.md) documents the equivalent local file commands.

The process speaks MCP over stdin and stdout. A client config looks like this (use the absolute path on your machine):

```json
{
  "mcpServers": {
    "cayfore": {
      "command": "node",
      "args": ["/absolute/path/Catalogfore/mcp/dist/index.js"]
    }
  }
}
```

`npm run test:mcp` starts that binary, lists the tools, and checks a known classic-jobs estimate (DBU $53.82, cloud $99.84 on the fixture in the test script).

## Tools

Tool results are JSON text with an estimates-only disclaimer. Validation failures reject the input or return an `error` field; clients should check for both before presenting a result. The eight tools below are registered by the local server. Your MCP client's handling of supplied data is separate from this repository's browser-local privacy model.

### `list_skus`

Optional `cloud` (`aws`, `azure`, `gcp`, default `aws`) and `tier` (`premium` or `enterprise`, default `premium`).

Returns the bundled reference SKU table, whether compute is included, the SQL DBU ladder, regions and their factors, curated instances with the reference-region VM price, foundation-model DBU rates, GPU serving DBU/hour, and the Photon multiplier. This is not the complete regional price inventory. Use the CLI's `rates` command or the browser's Unit costs view for scoped regional observations and evidence.

Azure `enterprise` uses the same list rates as Azure Premium. The payload says so.

### `estimate_workload`

`portfolio` is a versioned saved portfolio or a shorthand object with an explicit `workloads` array, up to 1,000 workloads. When using a browser JSON export, pass its nested `portfolio` object, not the whole report envelope or a file path. Unrelated objects such as `{}` are rejected. Versioned saves use the same strict validation as the website. Shorthand fills omitted settings with AWS, its reference region, Premium, and a flat-seasonality 12-month forecast with 8% annual growth. Unsupported workload kinds fail validation.

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

Same `portfolio`. Returns the canonical monthly estimate, `forecast` points, `months` with planning ranges, annual total, coverage, and assumptions used by the website and its exports. `annual` covers the first 12 months, even when the forecast horizon is 24 or 36 months. Growth compounds monthly. Seasonality is `flat`, `retail`, or `custom` (12 weights). `forecast.startMonth` fixes the calendar start; dated `events` change usage from their effective month. Prices and product formulas are recomputed for each forecast month. A flat year with zero growth and no dated changes sums to twelve times the run rate, subject to money rounding.

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

`csv` contains Databricks system-billing or supported FOCUS CSV text, up to 8,000,000 characters and 100,000 data rows. Include `list_price` when the query joined `system.billing.list_prices` ([export query](usage-export.sql)). Optional arguments are `cloud` (fallback for rows without cloud), `tier`, `region`, `asOf` (`YYYY-MM-DD` reporting cutoff, default today's UTC date), `month` (`YYYY-MM` explicit baseline), and `costBasis` (`effective` or `billed`, for FOCUS).

The default baseline is the latest complete month. A partial month requires an explicit `month`; the response warns that it remains a partial run rate. The importer preserves exported USD costs, signed corrections, per-row cloud placement, unpriced quantities, and observed monthly history. Non-USD input fails with a conversion message. No separate cloud VM bill is inferred. Unknown prices remain visible through source and estimate coverage plus warnings.

Enough contiguous history can fit a trend; shorter histories use a run rate. Responses include `method`, `mape`, `selectedMonth`, `asOf`, `costBasis`, `sourceCoverage`, `estimateCoverage`, `warnings`, `assumptions`, `pricesUpdatedOn`, and the same canonical `forecast`, `months`, `annual`, and `band` as the website. Planning ranges are not calibrated probabilities. A fitted diagnostic on synthetic data is not evidence of customer forecast accuracy.

The CLI accepts the corresponding options as `--cloud`, `--tier`, `--region`, `--as-of`, `--month`, and `--cost-basis`. `forecast saved-plan.json` and `estimate saved-plan.json` reopen versioned JSON exports using strict validation. `estimate --xlsx forecast.xlsx` writes an Excel workbook for the default plan. `forecast saved-plan.json --xlsx forecast.xlsx` writes one for a saved plan.

### `export_xlsx`

Same `portfolio` as `forecast`. Returns `filename` (`catalogfore-forecast-<cloud>-<YYYY-MM-DD>.xlsx`) and `workbookBase64`; the client must decode and save the bytes. The server does not write a file to your machine. The workbook has Summary, Monthly forecast, Breakdown, Products, Savings, and Rates sheets. Its Summary annual total covers year one; the Monthly forecast sheet includes all exported months. Totals use Excel formulas. It is an estimate, not a quote, and it says it is not affiliated with Databricks.

### `list_products`

No arguments. Lists product IDs, names, categories, billing units, publication status, confidence, source and notes from the bundled catalog. Use these IDs with `estimate_product`. Catalog inclusion does not establish availability in every cloud or region.

### `estimate_product`

Required `productId`, with optional `cloud`, `region` and `tier`. Defaults to AWS Premium and that cloud's reference region. Builds the product template, including underlying SKUs for a composition, and returns its estimate and 12-month product forecast. Inspect estimate coverage: unavailable rates remain unresolved and totals are known subtotals, not proof that the product is free. Use `forecast` with an explicit portfolio for custom quantities or schedules.

## What this server will not do

Time-limited product promotions apply only to eligible products and forecast dates in the bundled catalog. It will not invent a Photon speedup unless you pick `photon_speedup_2`. It will not treat an Azure Enterprise label as AWS Enterprise prices.
