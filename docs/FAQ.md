# FAQ

[Documentation index](README.md) · [Public FAQ](https://santoshshinde2012.github.io/Catalogfore/faq.html)

## What is Catalogfore?

Catalogfore is an independent Databricks cost calculator and budget planner. It models workloads, compares named scenarios, and projects costs from assumptions or imported usage. It is not affiliated with Databricks and does not provide a vendor quote.

## Where should I start?

Use **Plan** when you know a monthly amount and workload mix. Choose **Use my real usage** when you have billing CSV data, or open **Advanced** when you know individual products and schedules. **Product map** explains services and relationships; **Unit costs** exposes prices, evidence, and regional comparisons. [Walkthroughs](USABILITY.md)

## Are prices live or official quotes?

No. The app uses versioned snapshots and labels direct official observations, derived rates, planning estimates, and unresolved conflicts. The date on a source observation is distinct from a documentation review or tariff effective date. An official source does not establish availability for your account, negotiated discounts, or today's price. [Evidence guide](UNIT-COSTS.md)

## What does the forecast include?

Configuration estimates price Databricks usage and applicable cloud infrastructure. Usage imports preserve the selected month's monetary costs and their basis. Missing-price DBU rows can use labeled catalog estimates; unsupported charges remain unpriced. The importer does not infer a separate virtual-machine bill from DBUs. A total with unresolved costs is a **known subtotal**, not a complete budget.

The annual result covers the first 12 forecast months. Saved portfolios can carry a 24- or 36-month horizon; that does not turn the annual figure into a multi-year total.

## Which usage files can I import?

Use a Databricks billing CSV or supported FOCUS cost-and-usage CSV in USD. Review the baseline month, cost basis, coverage, and warnings before applying it. The latest closed calendar month is selected by default; partial months require an explicit selection. A closed month does not prove the file contains every billing row. FOCUS effective and billed costs are distinct, and recognized columns do not imply full FOCUS conformance. [Import guide](USAGE-IMPORT.md)

## Can I compare scenarios against a budget?

Yes. Set an annual budget, save a named baseline, change the active plan, and choose the baseline under **Compare current plan with**. Dated changes and growth affect the forecast. Comparisons identify unresolved prices; a difference between known subtotals is not a complete savings estimate. Savings recommendations are separate alternatives and can overlap.

## Can I save, reopen, and share a plan?

**Save scenario** stores up to 20 named plans in this browser. **Export → JSON** saves the active plan and its report as a portable file; reopen it with **Menu → Open forecast**. To back up all scenarios, open and export each one. CSV, XLSX, and PDF are reports rather than editable-plan backups.

**Copy link** includes plan inputs and monthly summaries, excludes ownership attribution, and recalculates using the receiving app's installed prices. Plans within the URL limits restore after reload. Oversized plans remain active but cannot be represented by a supported share link; export JSON before leaving or reloading. Storage failures also require a file backup. [Privacy and storage](PRIVACY.md)

## What do the charts and range mean?

Charts distinguish imported USD observations from future estimates. DBU-only observations remain in the history table. The low-to-high planning range combines usage-model and pricing assumptions; it is not a calibrated probability interval. Synthetic samples demonstrate behavior and do not establish accuracy on customer data.

## Does Catalogfore upload my data?

The web app processes files and calculations locally, without a Catalogfore account or server-side plan store. Anyone who receives a share link can inspect its inputs. JSON downloads and saved scenarios can contain ownership summaries even though links omit them. An MCP client has its own data-handling policy: sending a file to an assistant or connector is separate from local browser processing. [Privacy details](PRIVACY.md)

## What are the limits?

Browser usage and forecast files are capped at 8,000,000 bytes, with text and structure limits as well. Usage imports allow at most 100,000 rows; supported saved portfolios allow at most 1,000 workloads. Links have tighter limits: 100,000 encoded characters and 1,000,000 decoded JSON characters. Monetary inputs use USD. These are safety and interoperability bounds, not performance promises.

The app does not collect live workspace billing, synchronize scenarios across devices, send scheduled budget alerts, convert currencies, or infer safe downsizing from an invoice alone. [Remaining work](ROADMAP.md)
