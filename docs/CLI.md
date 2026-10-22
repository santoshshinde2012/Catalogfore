# Command-line guide

[Documentation index](README.md) · [Development setup](DEVELOPMENT.md) · [MCP](MCP.md)

Run these commands from the repository root after `npm ci`, using the supported Node version. The CLI reads local files and bundled pricing data; it does not connect to a Databricks workspace or refresh prices. `catalogfore` is the main npm command; `cayfore` remains an alias.

## Estimate the default plan

```sh
npm run --silent catalogfore -- estimate
npm run --silent catalogfore -- estimate --xlsx forecast.xlsx
```

The default command prints a compact JSON summary of the quick plan: first month, first-year total, planning spread, and price date. `--xlsx` also writes the workbook to the supplied path. Existing output files can be overwritten; choose a new path when keeping earlier reports.

## Reopen a saved forecast

Save the active plan with **Export → JSON** in the browser, then run:

```sh
npm run --silent catalogfore -- forecast saved-plan.json
npm run --silent catalogfore -- forecast saved-plan.json --xlsx saved-plan.xlsx
npm run --silent catalogfore -- forecast saved-plan.json > forecast-report.json
```

`estimate saved-plan.json` is also accepted. Inputs must be a supported versioned portfolio or the browser's forecast JSON envelope. The report includes the editable portfolio, priced estimate, dated points, monthly ranges, annual result, and assumptions. Prices come from the currently installed snapshot; a stored price-book reference does not supply the old price book.

`annual` covers the first 12 forecast months, including for portfolios with a 24- or 36-month horizon. In the workbook, the Summary annual total covers year one and the Monthly forecast total covers all exported months. Low/high values are planning ranges, not probability guarantees.

Use npm's `--silent` when redirecting output so npm banners do not become part of the JSON or CSV file. Errors are written to stderr and unsuccessful commands exit nonzero.

## Import usage with an explicit cutoff

```sh
npm run --silent catalogfore -- sql
npm run --silent catalogfore -- usage apps/web/public/sample-usage-history.csv --as-of 2026-10-17
npm run --silent catalogfore -- usage usage.csv --cloud aws --tier premium --region us-east-1 --as-of 2026-10-17 --month 2026-09
```

`sql` prints [usage-export.sql](usage-export.sql); it does not execute SQL. Run that query separately with your own authorized Databricks principal.

| Usage option            | Meaning                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `--cloud aws            | azure                                                         | gcp`                                                    | Fallback placement when rows do not identify their cloud; default AWS |
| `--tier premium         | enterprise`                                                   | Catalog edition; default Premium                        |
| `--region id`           | Supported region for the selected cloud                       |
| `--as-of YYYY-MM-DD`    | Reporting cutoff; defaults to today's UTC date                |
| `--month YYYY-MM`       | Explicit baseline, including a partial month when intentional |
| `--cost-basis effective | billed`                                                       | FOCUS cost basis; effective is preferred when available |

The CLI imports directly; it does not display the browser review dialog. Inspect its `selectedMonth`, `costBasis`, coverage, and warnings before using the result. No VM bill is inferred from DBUs. The bundled history sample is synthetic and is not evidence of customer forecasting accuracy. [Import semantics](USAGE-IMPORT.md)

`--xlsx` applies to `estimate` and `forecast`. To create a workbook from a usage result, save its JSON output and then run `forecast` on that file:

```sh
npm run --silent catalogfore -- usage usage.csv --as-of 2026-10-17 > usage-plan.json
npm run --silent catalogfore -- forecast usage-plan.json --xlsx usage-plan.xlsx
```

## Inspect products and reference costs

```sh
npm run --silent catalogfore -- products
npm run --silent catalogfore -- product jobs_serverless
npm run --silent catalogfore -- rates --product jobs_serverless --cloud aws --region us-east-1 --format csv > jobs-rates.csv
```

`products` lists catalog IDs, categories, billing units, and publication status. `product <id>` estimates the product's template using AWS Premium reference placement and default inputs. It is not a custom deployment quote. Inspect publication status, notes, and the Unit costs evidence before treating an amount as complete.

`rates` emits the same canonical inventory as the browser. Its default format is JSON. Filters can be combined:

| Option                                 | Accepted value                                                       |
| -------------------------------------- | -------------------------------------------------------------------- |
| `--format`                             | `json` or `csv`                                                      |
| `--product`, `--domain`, `--component` | Existing catalog ID                                                  |
| `--cloud`                              | `aws`, `azure`, or `gcp`                                             |
| `--region`                             | Supported region ID                                                  |
| `--tier`                               | `premium` or `enterprise`                                            |
| `--status`                             | `priced`, `approximate`, `conditional`, `unpriced`, `not_applicable` |
| `--evidence`                           | `official`, `derived`, `estimate`, `unresolved`, `not_applicable`    |
| `--query`                              | Search text; quote values containing spaces                          |

Missing prices remain empty. Evidence labels describe the source and scope of the bundled observation, not current service availability. [Unit-cost reference](UNIT-COSTS.md)

## Generate or verify the full rate artifacts

```sh
npm run export:unit-costs
npm run check:unit-costs
```

Generation writes ordinary CSV/JSON and their gzip copies in `data/generated/`. The compressed files are versioned; expanded files are local outputs. The check decompresses and compares the complete canonical contents without fetching new prices. To change the inputs, follow the [data pipeline](DATA-PIPELINE.md).
