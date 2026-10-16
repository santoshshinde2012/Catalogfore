# Product catalog

Databricks does not publish a machine-readable price list. Cayfore keeps its own, in [`data/product-catalog.json`](../data/product-catalog.json). The inventory of what each row means is [PRODUCTS.md](PRODUCTS.md). Dollar rates for the strategies stay in [`data/sku-rates.json`](../data/sku-rates.json) and the Azure meter file. This catalog does not replace those.

## Package

`@cayfore/catalog` (workspace package `packages/catalog`) loads the JSON and checks it with Zod. `parseProductCatalog` does the same for an object a script just downloaded. [`product-catalog.schema.json`](../packages/catalog/product-catalog.schema.json) is the JSON Schema for the same document. The package is private to this repo. It is not published to the public npm registry.

A product row has an id, a category, a billing unit, a list-price status, a confidence, an automation flag, a workload template, a citation, and optional input fields.

| `listPrice`   | Meaning                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `distinct`    | A list rate is applied. The forecast uses the existing strategy for `template`.                |
| `reused_sku`  | No separate public rate. The line uses another SKU and the note says which one.                |
| `unpublished` | No rate is stored. The workload is zero DBU, and the month is $0. A guessed price is not used. |

| `confidence`  | Meaning                                                                             |
| ------------- | ----------------------------------------------------------------------------------- |
| `measured`    | An Azure Retail Prices meter, checked 2026-10-16.                                   |
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

`workloadForProduct` starts from `createWorkload(template)` and applies `patch`. Advanced lists rows by the five categories. Builtin editors stay in charge of clusters, SQL, serving, and the other kinds that already had forms. Schema fields render `number`, `select`, and `boolean` inputs from the row, which is why a new multiplier product does not need a new component.

The four-input page is unchanged. It still builds classic jobs, serverless SQL, and the Llama 3.1 8B foundation-model line.

## Watch

`node scripts/catalog-watch.mjs` validates the file, compares East US Azure Databricks meter names with `knownAzureMeters`, and reads `https://www.databricks.com/feed`. `--offline` skips the network. The workflow is `.github/workflows/catalog-watch.yml`. It does not scrape Databricks price pages. The site terms disallow that, and those pages are not a rate feed.
