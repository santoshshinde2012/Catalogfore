# Product catalog

Databricks does not publish a machine-readable price list. Cayfore keeps its own, in [`data/product-catalog.json`](../data/product-catalog.json). The inventory of what each row means is [PRODUCTS.md](PRODUCTS.md). Dollar rates for the strategies stay in [`data/sku-rates.json`](../data/sku-rates.json) and the Azure meter file. This catalog does not replace those.

## Package

`@cayfore/catalog` (workspace package `packages/catalog`) loads the JSON and checks it with Zod. `parseProductCatalog` does the same for an object a script just downloaded. [`product-catalog.schema.json`](../packages/catalog/product-catalog.schema.json) is the JSON Schema for the same document. `data/product-catalog.json` points at it with `$schema`. The package is private to this repo. It is not published to the public npm registry.

A product row has an id, a category, a billing unit, a list-price status, a confidence, an automation flag, a workload template, a citation, and optional input fields.

| `listPrice`   | Meaning                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| `distinct`    | A list rate is applied. The forecast uses the existing strategy for `template`.        |
| `reused_sku`  | No separate public rate. The line uses another SKU and the note says which one.        |
| `unpublished` | No rate is stored. The month is $0, and the row says why. A guessed price is not used. |

| `confidence`  | Meaning                                                                             |
| ------------- | ----------------------------------------------------------------------------------- |
| `measured`    | An Azure Retail Prices meter, checked 2026-10-17.                                   |
| `cited`       | A first-party multiplier or DBU table (Microsoft Learn or a Databricks price page). |
| `secondary`   | The curated AWS/GCP table, or a SKU with no public meter feed.                      |
| `unpublished` | The absence of a rate is the finding.                                               |

`automation: azure-retail-prices` means the $/DBU can move when `refresh-prices` updates `data/azure-dbu-meters.json`. `manual` means a person has to re-read the citation. The watch treats a manual `fetchedOn` older than 120 days as stale.

## Adding a product

1. Add a row. Point `template` at a workload kind that already has a `CostStrategy`.
2. Set `patch` for the SKU, edition, or multiplier. Set `editor` to `schema` and add `fields` when the builtin editor is the wrong form.
3. If the Azure meter name is new, add it to `knownAzureMeters`. Otherwise the Monday job will report it.
4. Cite the page and the date. If you do not have a rate, use `listPrice: unpublished` and do not invent one.
5. `npm test` checks the schema, and `docs/PRODUCTS.md` must mention the product name.

A new kind, one the strategies do not price yet, is still a new file under `packages/engine/src/costing/strategies/` and a registry entry. The catalog cannot price a formula that does not exist.

## What the app does with a row

`workloadsForProduct` starts from `createWorkload(template)` and applies `patch`. A row with `parts` adds one workload per underlying SKU. A `formula` turns editable inputs into DBU or dollars before `estimate` runs, so the strategies stay free of product names. Advanced lists rows by the five categories. Builtin editors stay in charge of clusters, SQL, serving, and the other kinds that already had forms. Schema fields render `number`, `select`, and `boolean` inputs from the row.

The four-input page is unchanged. It still builds classic jobs, serverless SQL, and the Llama 3.1 8B foundation-model line.

## Watch

`node scripts/catalog-watch.mjs` validates the file, compares Azure Databricks meter names in every rate-card region with `knownAzureMeters`, rewrites the coverage report and `docs/PRODUCTS.md`, and reads `https://www.databricks.com/feed`. `--offline` skips the network. The Monday workflow is `.github/workflows/weekly-catalog.yml` (`scripts/weekly-catalog.ts`). It runs that watch, the price refresh, and a robots-and-sitemap metadata check. It does not scrape Databricks price pages. The site terms disallow that, and those pages are not a rate feed.

## Checked on 2026-10-17

The weekly refresh re-read Azure Retail Prices for every region on the rate card and the AWS EC2 offer files. GCP was skipped because `GCP_BILLING_API_KEY` is not set. The two Databricks price-JSON probes still found no rates. No product was added or removed. No dollar rate in the price book, the VM file, or the Azure meter file changed. Versions are catalog `2026-10-17.1`, price book `2026-10-17.1`, instances `2026-10-17.1`, and price files `2026-10-17.2`. The default medium AWS year stays $170,257.52.

### Transactions are Generally Available

[Transactions are Generally Available, advancing warehousing on the Lakehouse](https://www.databricks.com/blog/transactions-are-generally-available-advancing-warehousing-lakehouse) (2026-10-16) announces multi-statement transactions on Delta Lake and Apache Iceberg, including stored procedures, temporary tables, and SQL scripting. The post does not name a new SKU, a DBU rate, or a price. The work runs on a SQL warehouse and is billed as that warehouse’s existing DBU. It is not a catalog row.

[Closing the Binary Blind Spot](https://www.databricks.com/blog/closing-binary-blind-spot-domain-knowledge-injection-llm-malware-triage-npm-packages) (2026-10-16) is a research note about malware triage. It is not a billable product. Feed items from 2026-10-14 and 2026-10-15 (Predictive AI Functions, Document Intelligence, the Stripe to Lakebase connector, geospatial queries) are already represented or are not a new list rate.

### Promotions re-checked on 2026-10-17

- Genie One and Genie Agents user LLM usage stays free through 2027-01-31. Genie Code stays at the documented 25% factor through that date. Neither window has expired.
- Zerobus’s launch promotion still has no end date in the GA post. The catalog does not apply it. The secondary list stays $0.050/GB on AWS Premium and $0.064/GB on AWS Enterprise and Azure.
- AI Parse Document’s 50% promotion ended 2026-06-30. The catalog uses the midpoint of the published DBU-per-page band and does not apply that discount.
- Serverless real-time inference promotional pricing through 2027-01-31, and the Mission Critical 50% add-on through 2027-06-30, stay off the default rates.

### Source links

All 13 unique product source URLs resolved on 2026-10-17. Twelve returned HTTP 200 to the catalog checker. The Databricks community post used by the model-serving launch row returned 403 to that checker and 200 to a browser user agent, so the citation stays.
