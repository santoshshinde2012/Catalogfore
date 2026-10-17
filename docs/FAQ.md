# FAQ

The same answers are on the public page at https://santoshshinde2012.github.io/cayfore/faq.html. The forecast page layout does not include this section.

## What is Cayfore?

Cayfore is an independent Databricks cost calculator and budget planner. It models pipelines, dashboards, and AI workloads, compares named scenarios, and projects monthly and annual spend from assumptions or imported usage. It is an estimate, not a Databricks quote, and is not affiliated with Databricks.

## What does the DBU forecast include?

Configuration estimates price Databricks usage and the relevant cloud infrastructure. Usage imports preserve the selected month’s exported monetary costs. Missing DBU prices use labelled catalog estimates; unsupported charges remain visibly unpriced. A virtual machine bill is not inferred from imported DBUs.

## How is this different from a Databricks pricing estimator?

Cayfore combines mixed workloads into a plan over time, with budgets, dated changes, and named scenarios. It can read local billing CSV files and keeps the calculation in the browser. It does not require a workspace login or a connected billing account.

## Which usage files can I import?

Import a Databricks billing CSV or a recognized FOCUS cost and usage CSV in USD. Review the selected month, cost basis, price coverage, and warnings before replacing or adding workloads. The latest closed calendar month is selected by default. FOCUS effective and billed costs are labelled separately.

## Can I compare scenarios against a budget?

Yes. Set an annual budget to see forecast headroom or overspend, save named scenarios, and compare their costs. Growth, dated workload changes, and pricing assumptions affect the projections. Named scenarios are saved in this browser. Export the active plan as a JSON file to open that plan in another browser. The Export menu also downloads an Excel workbook of the same forecast.

## What do the charts and forecast range mean?

The chart plots imported observed costs in USD alongside the model’s future projection. DBU-only observations appear in the history table. The low-to-high planning range combines usage uncertainty and pricing assumptions; it is not a calibrated probability interval. Unpriced charges remain outside the known cost subtotal.

## Does Cayfore upload a usage file or the estimate?

No. Usage files and calculations stay local; Cayfore does not save them on a server. A share link embeds the plan in its URL hash, so anyone receiving it can read the shared plan. Attribution summaries are excluded from shared links. Saved forecast JSON files can contain team or owner labels.
