# MCP server

A local stdio server that estimates Databricks cost with the same engine as the website. It does not log into a workspace, and it does not read `system.billing.usage` unless you pass numbers in yourself.

Databricks’ own managed MCP servers (Genie, SQL, AI Search, Unity Catalog functions) are the right tool for live account data. They do not publish list prices. Use those for usage, and this server for the forecast.

## Run

```bash
npm install
npm run build
node mcp/dist/index.js
```

The process speaks MCP over stdin and stdout. A client config looks like this (use the absolute path on your machine):

```json
{
  "mcpServers": {
    "databricks-cost-forecaster": {
      "command": "node",
      "args": ["/absolute/path/databricks-cost-forecaster/mcp/dist/index.js"]
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

`portfolio` is an object. Missing fields are filled by the same normalizer as the website (AWS, `us-east-1`, Premium, flat 24-month forecast, 8% growth, unless you set them).

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

Same `portfolio`. Returns the monthly estimate plus one point per forecast month. Growth compounds monthly. Seasonality is `flat`, `retail`, or `custom` (12 weights). A flat year sums to twelve times the run-rate.

### `compare_scenarios`

`portfolio`, plus optional `presets`:

| Preset | What changes |
| --- | --- |
| `as_modeled` | The portfolio as given |
| `jobs_serverless` | Classic jobs and Lakeflow pipelines move to serverless, keeping monthly DBUs and dropping the VM line |
| `photon_on` | Photon on classic clusters (2.9× DBU emission, same hours) |
| `photon_speedup_2` | Photon on, and hours cut in half. The speedup is an assumption, not a measurement |
| `spot_70` | 70% of workers on spot |
| `commit_37` | 37% off the DBU line |
| `commit_37_cloud_30` | 37% off DBUs and 30% off on-demand VM hours |

The default comparison is `as_modeled`, `jobs_serverless`, and `commit_37`.

## What this server will not do

It will not apply the Lakehouse Real-Time 30% emission promo (through 2027-01-31). That promo is not a discount on jobs, SQL, or serving. It will not invent a Photon speedup unless you pick `photon_speedup_2`. It will not treat an Azure Enterprise label as AWS Enterprise prices.
