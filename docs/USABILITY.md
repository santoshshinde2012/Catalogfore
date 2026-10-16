# Usability

Checked in the running app on 2026-10-16, catalog **2026-10-16.1**. Figures are what the page showed. They are estimates, not a quote. Fathom is not affiliated with Databricks.

The page is one forecast. Cloud and tier, a starting monthly amount or a team size, a mix of pipelines / dashboards / models, and monthly growth. The year updates as those change. A shaded 12-month band, the year total, one sentence, and a month table are the result. Region, a commitment discount, a usage file, and the per-workload builder sit behind that.

Light is the default. Dark mode is optional. Databricks’ own forecast (Usage Dashboard 2.0, budgets, `ai_forecast`) needs an account admin and billing history. Public cloud calculators price one SKU and assume you already know DBU rates. This page is the public 12-month number for a team that is evaluating, new, or writing a budget.

## Evaluating — what does a medium team cost on AWS?

Land on the page. Medium is selected: 45% pipelines, 40% dashboards, 15% models, about $12,000 a month before a discount. AWS, Premium, US East (N. Virginia). Growth is 0%.

- Sentence: **About $143,960 per year, ±20%.**
- First month: **$11,997**. The three dollars are rounding on the priced lines.
- **29% of the bill is cloud machines.** That share is the classic-job portion. Dashboards are serverless, and models are token usage, so they do not add a machine line.
- The shaded band is 15% under to 20% over, because no usage file has been loaded. The table lists all 12 months.

Nothing on this path asks for a DBU rate, an instance, or an hour count. “How we got this” names the archetypes and says Databricks bills usage in DBU, which the page converts from the dollars you typed.

Why $12,000, and why that mix, is in [docs/RESEARCH.md](docs/RESEARCH.md) section 15. Short version: it is the top of a published $8,000–$12,000 band for a 10 TB analytics team, pipelines lead, and dashboards plus a little model use fill the rest.

## Budgeting — a small team growing 5% a month

Click Small. The mix becomes 35% pipelines, 55% dashboards, 10% models, and the first month is **$2,000**. Flat year: **About $23,996 per year, ±20%.** Cloud machines are **23%** of the bill.

Click 5% monthly growth. The first month stays **$2,000**. The year becomes **About $31,828 per year, ±20%.** Each month is 5% above the one before it. The label says monthly, so a 5% click is not a 5% year.

A commitment discount, if you set one, lowers the Databricks portion and leaves the machine portion alone. The starting-spend field stays the pre-discount amount.

## Already spending — replace the guess with a usage file

“Use my real usage” takes a `system.billing.usage` CSV. The sample file (jobs, notebooks, serverless SQL) replaces the monthly amount and the mix:

- **From your usage file: about $1,573 this month. 65% pipelines, 35% dashboards, 0% models.**
- Year: **About $18,878 per year, ±6%.** The range tightens because the file supplied the quantity. Machine cost is still inferred, because the file does not list virtual machines. Cloud machines are **34%** of that bill.
- Cloud, tier, region, growth, and the discount stay where you left them. “Use the sliders instead” returns to a typed amount.

## Same work on another cloud

Medium on AWS is about **$11,997** in month one. Switch the cloud to Azure and keep the same mix. The first month becomes **$16,063**, and the year **About $192,752 per year, ±20%.** Cloud machines are **33%** of that bill. The workloads did not get larger. The rate card changed, including the East US virtual-machine prices read from the Azure Retail Prices API on 2026-10-16. The mix line still reads 45% / 40% / 15%.

## What is better than the other tools

- Usage Dashboard 2.0, budgets, and `ai_forecast` forecast from `system.billing.usage`. They are the right tool once an admin can open the account console. This page does not ask for that login, and it says so, with links, at the bottom.
- The AWS, Azure, and Google calculators, and Databricks’ instance calculator, price a SKU you already know how to name. This page asks for a monthly amount and a mix, and the engine turns that into classic jobs, serverless SQL, and token usage.
- The per-workload builder is still there, under Advanced, for someone who wants to change an instance or a schedule. It is not the front door.

## What moved off the front door

The four opening questions, the portfolio name, and the side-by-side scenario board are gone from the first screen. Savings stay under “Ways to pay less,” each with an annual dollar amount. A share link, CSV, JSON, and PDF sit with the chart.
