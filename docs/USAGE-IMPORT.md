# Importing observed usage

Upload a Databricks `system.billing.usage` CSV or a FOCUS cost and usage CSV. Files are parsed locally. Use [usage-export.sql](usage-export.sql) or the [Databricks notebook](cayfore-usage.py) to export closed calendar months with list prices and attribution fields.

## Review and apply a file

1. Export the current active plan as JSON if you want a portable backup.
2. In **Plan → Use my real usage**, choose a CSV. Browser uploads are limited to 8,000,000 bytes and parsed text to 8,000,000 characters; CSV parsing accepts at most 100,000 data rows.
3. Review the selected month, exported cost, price coverage, unpriced quantities, attribution and warnings.
4. Choose **Use this baseline** to replace the current plan, or **Append usage to plan** to combine the selected month's workloads with it.

Nothing is applied before confirmation. Append does not merge historical months into one monthly bill. Adding another export for the same source and month is rejected to prevent overlap; replacing the baseline reconciles later corrections. The resulting portfolio must fit the supported 1,000-workload limit. [CLI](CLI.md) and [MCP](MCP.md) import directly and return the review information as structured output.

## Choose the reporting period

The default baseline is the latest calendar month that ended before the observation date. A September file with a last usage record on September 15 is still a closed September period when imported in October. A closed period does not prove that every expected billing row is present. The file must contain the scope you intend to forecast. Missing dates and months are not filled with invented zero usage.

The current month is excluded from the default baseline and historical trend. Explicitly selecting it uses the observed amount through the observation date; the calculator does not extrapolate partial data to a full month. Undated files remain supported as monthly aggregates, with a warning that their period cannot be verified. Application entry points supply today as the observation cutoff. Direct engine callers can pass `asOf: "YYYY-MM-DD"`; omitted cutoffs use the catalog verification date so domain-only calls remain deterministic.

## Preserve costs, corrections and unknowns

Signed quantities remain signed. Databricks ORIGINAL, RETRACTION, and RESTATEMENT rows are summed together; a negative retraction is never negated a second time. Zero list prices represent free usage. An imported monetary baseline does not add an estimated virtual machine bill or silently apply an existing commitment discount.

Each priced row contributes `quantity × price`. When both prices are present, the default is `effective_list_price`, which resolves published promotions. The original `list_price` remains available for an explicit list-price comparison. Effective-list prices are distinct from FOCUS effective cost: they do not include private negotiated terms or amortization. A group containing priced and unpriced rows keeps both: known dollars remain an imported cost and known unpriced DBU SKUs use their own catalog rate as an estimate. Unrecognized SKUs with exported dollar costs retain those costs. Unsupported units without prices remain visible as unpriced workloads. Supported monetary imports use USD; other currencies are rejected rather than converted with an assumed exchange rate.

## History and ownership

Historical charts use one unit throughout a series. Fully priced history uses USD. Partly priced DBU-only history uses DBUs so missing prices do not erase usage. Dollar history that includes unpriced non-DBU rows is explicitly incomplete, and is not used to fit an observed-cost trend. A DBU trend applied to a monetary baseline assumes stable unit pricing and workload composition.

Workspace IDs, tags, resource metadata, and owner identities can be read from JSON struct columns or flattened columns such as `identity_metadata.run_as`. The preview supports grouping by tags, workspace, owner, or resource fields. Saved forecast JSON files retain monthly aggregates and attribution summaries, which may contain team or owner labels; they do not retain raw usage rows or identity metadata. Shared links exclude the attribution summary.

## Supported FOCUS columns

FOCUS 1.3 and 1.4 cost and usage column names are recognized. Effective cost is the default when available and represents amortized cost; billed cost is an explicit cash-basis alternative. Billed-only files use billed cost. This is a cost import, not a claim of full FOCUS dataset conformance. It includes all services in the file, so filter unrelated services before import. Charges spanning several calendar months must first be exported at daily or monthly granularity. A monthly charge ending at midnight on the first day of the next month is assigned to its starting month.

FOCUS cost semantics: [effective cost in 1.3](https://focus.finops.org/docs/specification/v1-3/columns/effective-cost/), [billed cost in 1.3](https://focus.finops.org/docs/specification/v1-3/columns/billed-cost/), and [effective cost in 1.4](https://focus.finops.org/docs/specification/v1-4/columns/cost-and-usage/effective-cost/).

## Source semantics

Databricks pricing and correction semantics: [pricing system table](https://docs.databricks.com/aws/en/admin/system-tables/pricing) and [billable usage system table](https://docs.databricks.com/aws/en/admin/system-tables/billing). Record IDs and ingestion dates are retained in the local preview. Identical records with matching IDs are counted once; corrections remain signed, distinct records. A historical `asOf` excludes records ingested after that observation date. Selecting an earlier baseline month also excludes later months from the trend, preventing future data from influencing a historical forecast.

See [Privacy](PRIVACY.md) before sharing an imported plan. Links omit usage attribution summaries but can still contain names or other text you entered. Use JSON when the plan exceeds the share-link limits.
