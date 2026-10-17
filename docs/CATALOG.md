# Product catalog

Cayfore's [`data/product-catalog.json`](../data/product-catalog.json) describes products, workload templates, editable drivers and source context. It is an inventory, not a complete worldwide tariff or an availability guarantee. [PRODUCTS.md](PRODUCTS.md) is its generated product directory.

Public dollar prices resolve through the shared engine policy. Exact Azure Retail Prices meters and validated Databricks price-card/calculator observations take precedence over labelled reference estimates. Native component prices and consumption conversions use the shared component registry. Customer-supplied rates and imported monetary costs retain their own provenance. [UNIT-COSTS.md](UNIT-COSTS.md) explains the quote policy, units, evidence and exclusions; [DATA-PIPELINE.md](DATA-PIPELINE.md) describes source capture and maintenance.

## Package

`@cayfore/catalog` (workspace package `packages/catalog`) loads the JSON and validates it with Zod. `parseProductCatalog` validates an object supplied by a script. [`product-catalog.schema.json`](../packages/catalog/product-catalog.schema.json) describes the same document, referenced by its `$schema`. The package is private to this repository.

A product has an ID, category, billing description, list-price status, confidence metadata, workload template, citation and optional input fields or billable parts. These product-level fields do not establish a price or availability for every component and placement.

| `listPrice`   | Meaning                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `distinct`    | A stored price is applied where its offering and source scope match. Missing or conflicted placements can remain unresolved.                                  |
| `reused_sku`  | The product reuses underlying billing SKUs; it does not assert a second independent tariff. Consumption assumptions remain visible.                           |
| `unpublished` | No standalone public quote is resolved in this catalog. Product defaults start unpriced; a missing charge is a gap in the known subtotal, not a free service. |

Product `confidence` and `automation` fields describe catalog metadata and maintenance. They do not replace component evidence. Unit costs classify the actual resolved observation as an official list price, a derived rate, a planning estimate or an unresolved quote. An authentic documentation link alone does not verify a numeric rate. Observation dates, documentation reviews and tariff effective dates remain separate.

`automation: azure-retail-prices` identifies an Azure meter mapping; `manual` identifies a citation requiring separate review. The shared pricing policy can still use captured Databricks observations for an underlying SKU regardless of these product-level flags. Manual citations older than 120 days are flagged for review.

## Adding a product

1. Add a product row and point `template` at a workload kind supported by a cost strategy.
2. Use `patch` for usage defaults and configuration, and `parts` when several underlying components are billed. Keep public prices and shared conversions in their maintained pricing inputs rather than duplicating them in example quantities.
3. Set `editor` and `fields` for the required drivers. Match the operational unit to its quoted quantity, such as tokens, DBUs or 50-model-unit block-hours.
4. Cite the exact offering, unit, cloud, region, edition and observation date. If a supported quote is missing, use an explicit unresolved status rather than inventing a price. Add new Azure meter names to `knownAzureMeters` when applicable.
5. Regenerate the product directory and unit-cost exports. Run the schema, source, unit-cost and relevant consumer checks described in [DATA-PIPELINE.md](DATA-PIPELINE.md).

A new workload kind requires a cost strategy and registry entry. Catalog metadata cannot price a formula or unit conversion the engine does not implement.

## What the app does with a row

`workloadsForProduct` starts with `createWorkload(template)`, applies configuration and usage defaults, and seeds supported native component prices from `rates/components.ts`. A product with `parts` produces one workload per billable part. A named `formula` converts editable drivers into consumption before estimation. Public native prices resolve from the installed component registry; stale embedded public values do not become an independent source of truth. Explicit custom or imported amounts stay separate.

Advanced groups products by category. Builtin editors handle clusters, SQL, serving and the other supported workload kinds; schema fields render the remaining declared drivers. Direct monetary edits are labelled customer assumptions. The simple forecast uses classic jobs, serverless SQL and a curated foundation-model workload as its three archetypes.

The Unit costs view projects the same maintained inputs and quote policy into component rows. Its regional comparisons match a complete configuration and billing basis, and exclude unresolved quotes from price bars. The calculator multiplies already billable quantities; allowances and billed-usage adjustments must not be applied twice.

## Current snapshot: 2026-10-17

The product catalog and price book are version `2026-10-17.3`. The generated inventory has **29,665 rows covering 70 pricing products and eight platform concepts**. This is the modeled inventory, not every published Databricks service or price dimension.

The retained Databricks captures contain 1,059 accepted USD/DBU observations. Twenty-one same-key first-party disagreements are quarantined, including eleven within the supported catalog regions. Azure has 530 mapped DBU observations across 39 supported regions, each retaining its own observation and meter metadata. [Source maintenance](DATA-PIPELINE.md) explains capture replay and the distinction between snapshot consistency and current vendor pricing.

Jobs Light, Clean Rooms and Data Processed have public native observations only for Azure East US. Other supported Azure regions have explicit unresolved rows; unsupported cloud prices are not inferred. Zerobus has retained official US East GB price-card observations for the modeled AWS/Azure offerings. GTE provisioned capacity remains unresolved consistently in the forecast and inventory, while independently priced token usage can remain in the known subtotal.

Cloud VM prices, Spot estimates, storage assumptions and curated consumption profiles have their own evidence and dates. GCP VM seeds are separate from the public Databricks GCP DBU capture. Promotions and connected services remain subject to their recorded eligibility, billing basis and exclusions.

## Weekly review

`.github/workflows/weekly-catalog.yml` runs the price refresh and catalog watch, captures official Databricks JSON, validates normalized prices against retained response bytes, and rebuilds generated reports and exports. It opens or updates its single review PR and does not merge it. Metadata signals can identify research work; they do not prove a new billable tariff.

`node scripts/catalog-watch.mjs` validates catalog metadata, compares known Azure meter names, updates coverage and the generated product directory, and reads allowed public metadata signals. Use the documented dry-run commands in [DATA-PIPELINE.md](DATA-PIPELINE.md) when reviewing changes without applying them.

## Historical product signals

[Transactions are Generally Available](https://www.databricks.com/blog/transactions-are-generally-available-advancing-warehousing-lakehouse), published 2026-10-16, announced multi-statement transactions on Delta Lake and Apache Iceberg. The announcement did not establish a new DBU rate; the catalog associates this work with the existing SQL warehouse billing model.

[Closing the Binary Blind Spot](https://www.databricks.com/blog/closing-binary-blind-spot-domain-knowledge-injection-llm-malware-triage-npm-packages), also published 2026-10-16, concerns malware-triage research rather than a separately priced product. Such announcements require classification before becoming catalog entries.
