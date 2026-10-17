# Usability

Updated against the running app on **2026-10-18**. The quick page uses rate card **2026-10-17.1** and the product catalog is **2026-10-17.1**. These are reproducible walkthroughs and browser checks, not participant usability research. Figures are estimates, not a quote. Cayfore is not affiliated with Databricks.

The page is one forecast. Cloud and tier, a starting monthly amount or a team size, a mix of pipelines / dashboards / models, and monthly growth. The year updates as those change. A shaded 12-month band, the year total, one sentence, and a month table are the result. Region, a commitment discount, a usage file, and the per-workload builder sit behind that.

Light is the default. Dark mode is optional. Databricks’ own forecast (Usage Dashboard 2.0, budgets, `ai_forecast`) needs an account admin and billing history. Public cloud calculators price one SKU and assume you already know DBU rates. This page is the public 12-month number for a team that is evaluating, new, or writing a budget.

## Navigating and editing

On a phone, **View forecast** jumps from the inputs to the result; **Edit inputs** returns to the form. The fixed summary respects the device's safe area. Chart tabs form a balanced two-column layout on narrow screens. Month tables and billing details scroll within named, keyboard-focusable regions.

The Cayfore brand returns to the inputs while keeping the current plan. **Menu → New forecast** explicitly starts again; **Undo last change** restores the previous plan. Section navigation preserves the shared URL and moves keyboard focus to its destination. The Open forecast menu item works with a keyboard or touch. Header destinations use plain text and active underlines, with one unboxed Menu trigger for secondary actions.

Starting spend retains the amount entered. A separate modeled baseline explains sizing differences. Enter applies spend or custom growth; invalid drafts show an error and preserve the last valid forecast. Adding or selecting an advanced workload reveals and focuses its editor; closing or removing it restores focus to the workload list.

The import review keeps its primary action visible while the billing details scroll. Budget, scenario, timeline, and commitment panels explain their empty states and display action feedback. Layout and accessibility checks cover 320px, 390px, and 1440px in light and dark themes.

The Unit costs Downloads tab previews the canonical inventory in a sortable table. Filtered or complete scope applies to both the preview and CSV/JSON, while paging only limits visible rows. Billing quantities, source dates and evidence stay beside each price; Inspect opens the exact row and its calculator. On phones, the table scrolls inside its named keyboard-focusable region. Reference filters and these calculations leave the saved forecast unchanged.

## Evaluating — what does a medium team cost on AWS?

Land on the page. Medium is selected: 45% pipelines, 40% dashboards, 15% models, about $12,000 a month before a discount. AWS, Premium, US East (N. Virginia). Growth is 3% a month, so the chart rises.

- Sentence: **About $170,258 per year, ±20%.**
- First month: **$11,997**. The three dollars are rounding on the priced lines. Month 12 is higher because each month is 3% above the one before.
- **29% of the bill is cloud machines.** That share is the classic-job portion. Dashboards are serverless, and models are token usage, so they do not add a machine line.
- The shaded band is 15% under to 20% over, because no usage file has been loaded. Chart is the default view. Months lists all 12 months.

Nothing on this path asks for a DBU rate, an instance, or an hour count. “How we got this” names the archetypes and says Databricks bills usage in DBU, which the page converts from the dollars you typed.

Why $12,000, and why that mix, is in [RESEARCH.md](RESEARCH.md) section 15. Short version: it is the top of a published $8,000–$12,000 band for a 10 TB analytics team, pipelines lead, and dashboards plus a little model use fill the rest.

## Budgeting — a small team growing 5% a month

Click Small. The mix becomes 35% pipelines, 55% dashboards, 10% models, and the first month is **$2,000**. Growth stays at 3% a month, so the year is **About $28,379 per year, ±20%.** Cloud machines are **23%** of the bill.

Click 5% monthly growth. The first month stays **$2,000**. The year becomes **About $31,828 per year, ±20%.** Each month is 5% above the one before it. The label says monthly, so a 5% click is not a 5% year. Setting growth to 0% is the flat year, **About $23,996**.

A commitment discount, if you set one, lowers the Databricks portion and leaves the machine portion alone. The starting-spend field stays the pre-discount amount.

## Already spending — replace the guess with a usage file

“Use my real usage” accepts Databricks billing or recognized FOCUS CSVs. Choose a file, inspect its month and price coverage, then choose **Use this baseline**. No input changes before that confirmation. A partial month requires explicit selection. See [USAGE-IMPORT.md](USAGE-IMPORT.md).

The small bundled sample has no exported prices. At cutoff 2026-10-17 it selects September, preserves 3,000.5 DBUs, and uses catalog estimates with an unresolved storage line. It does not add an inferred VM bill. The known baseline is **$989.35**, with a roughly **$14,041** year when retaining the web page's initial 3% monthly-growth assumption. These are demonstrations, not observed invoice dollars.

**Load history sample** uses the priced 18-month demonstration. It selects June 2026, with **$2,734.35** exported cost, starts the forecast in July 2026, and produces a roughly **$36,582** year. Historical USD observations and future estimates are distinct chart series. The sample designation remains visible after save/reload. Neither synthetic sample establishes customer accuracy.

Global growth and commitment controls preserve imported workloads. Growth changes explicitly replace the fitted path with the chosen manual rate. A saved scenario retains monthly observations and can be compared with the current plan.

## Same work on another cloud

Medium on AWS is about **$11,997** in month one. Switch the cloud to Azure and keep the same mix and the 3% growth. The first month becomes **$16,063**, and the year **About $227,962 per year, ±20%.** Cloud machines are **33%** of that bill. The workloads did not get larger. The rate card changed, including the East US virtual-machine prices read from the Azure Retail Prices API on 2026-10-16. The mix line still reads 45% / 40% / 15%.

## What is better than the other tools

- Usage Dashboard 2.0, budgets, and `ai_forecast` forecast from `system.billing.usage`. They are the right tool once an admin can open the account console. This page does not ask for that login, and it says so, with links, at the bottom.
- The AWS, Azure, and Google calculators, and Databricks’ instance calculator, price a SKU you already know how to name. This page asks for a monthly amount and a mix, and the engine turns that into classic jobs, serverless SQL, and token usage.
- The per-workload builder is still there, under Advanced, for someone who wants to change an instance or a schedule. It is not the front door.

## What moved off the front door

The quick inputs remain on the first screen. Budget and named-scenario controls follow the main forecast. Savings stay under “Ways to pay less,” each with an annual amount and an explicit overlapping-alternatives explanation. Copy link is the primary action. Excel, CSV, JSON, and PDF sit in the Export menu.

## Advanced, checked by hand

Open Advanced and use Add product. Cloud is AWS, tier Premium, region US East, unless a scenario says otherwise. Month totals below are the engine’s month, before the portfolio’s 8% annual growth. Each line that is a multiplication was recomputed outside the engine and matches `packages/engine/src/scenarios.test.ts`.

### Startup analytics

Add Serverless jobs, SQL warehouse, and Managed storage. Leave the defaults.

- Serverless jobs: 8 DBU/hour × 8 hours × 5 days × 52/12 × $0.35 = **$485.33**.
- SQL warehouse: size S is 12 DBU/hour, scale 1–2 at 45% is 1.45 warehouses, same hours, × $0.70 = **$2,111.20**. Serverless includes the machine.
- Managed storage: 500 GB × $0.023 = **$11.50**.
- Month: **$2,608.03**.

### Enterprise ETL

Switch the tier to Enterprise. Add Jobs cluster, Lakeflow pipeline, and Serverless jobs.

- Jobs cluster: 4.2 nodes (2–4 at 60%) × 0.69 DBU/hour × the same 173.33 hours × $0.20 = **$100.46** of DBU. Machines: $0.192/hour × 728 node-hours = **$139.78**. Line **$240.24**.
- Serverless jobs: the same 8 DBU/hour schedule × the Enterprise rate $0.45 = **$624**.
- Lakeflow pipeline is the Pro default (2–4 × i3.xlarge, Photon, 24×7): **$2,375.10** DBU and **$1,022.11** machines, line **$3,397.21**.
- Month: **$4,261.45**.

### GenAI app

Add Agent Bricks. That one product adds three lines, because Bricks has no fee of its own.

- Serving, CPU concurrency 2, 12h × 7d: 728 DBU × $0.07 = **$50.96**.
- Vector search, 1 standard unit, 24×7: 2,912 DBU × $0.07 = **$203.84**. The 20 GB index is inside the 30 GB free allowance.
- Training: 100 DBU × $0.65 = **$65**.
- Month: **$319.80**. Do not also add AI Search for the same index.

### BI with Genie

Add Genie spaces and AI/BI Dashboards.

- Genie LLM is **$0**. User usage is free through 2027-01-31.
- Genie SQL: 10 users × 40 questions × 0.25 DBU × $0.70 = **$70**. The 0.25 DBU per question is an assumption, not a list rate.
- Dashboards: 20 viewers × 22 refreshes × 1 DBU × $0.70 = **$308**. The 1 DBU per refresh is an assumption.
- Month: **$378**. If one warehouse serves both Genie and the dashboards, keep one of the SQL lines.

### OLTP with Lakebase and an app

Add Lakebase, Databricks App, and Lakebase branches.

- Lakebase: 2 CU × 16h × 7d × 52/12 × $0.111, plus 50 GB × $0.345 = **$124.99**.
- App, medium: 0.5 DBU/hour × 10h × 5d × 52/12 × $0.75 = **$81.25**.
- Branch compute: 1 CU × 8h × 5d × 52/12 × $0.111 = **$19.24**. Branch storage: 10 GB × $0.023 × 15 = **$3.45**.
- Month: **$228.93**.
- The same Lakebase line on GCP is unresolved. It contributes $0 to the known subtotal and the estimate visibly says that the total is incomplete.
