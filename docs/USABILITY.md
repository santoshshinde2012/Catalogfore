# Usability

Checked in the running app on 2026-10-15, catalog **2026-10-15.2**. Figures are what the page showed. They are estimates, not a quote.

The page opens on a question, not a form. Each question loads a portfolio with the assumptions already filled, so the first number is on screen in one click. The arithmetic is under the number. A change that saves money shows the annual dollars and an Apply button. The year is a low / expected / high band, not a single false-precision total.

## Platform lead — what will the team cost next year?

Starting point: nightly transforms (2 workers, 3 hours, 7 days), analyst notebooks (6 hours, 5 days), a small serverless SQL warehouse, 400 GB storage, 80 GB egress. AWS Premium, US East, 8% growth, 12 months.

- This month: **$1,829**
- First 12 months: **$19,331 low / $22,742 expected / $27,291 high**
- The year is higher than 12 × $1,829 because growth compounds inside the year. This month stays the run rate.
- Why, as printed:
  - Nightly transforms **$80.68** — 3 nodes × 0.69 DBU/h × 91 h × $0.15/DBU, plus VM $0.192/h.
  - Analyst notebooks **$148.59** — 2 nodes × 0.69 DBU/h × 130 h × $0.55/DBU, plus the VM line.
  - BI warehouse **$1,583** — 12 DBU/h × 1.45 × 130 h × $0.70/DBU. The 1.45 is one warehouse plus 45% of the way from min 1 to max 2. Serverless SQL has no VM line.
- An annual budget of $25,000 reads **$2,258 under** the expected year.
- Largest lever on the page: a 37% DBU commit plus 30% off VMs, about **$8,250** in the first year. The card says both numbers are planning assumptions, not an offer.

Spot-check of the nightly line against the catalog: 3 × 0.69 DBU/h × (3 × 7 × 52/12) h × $0.15 = $28.27 of DBU, and 3 × $0.192/h × 91 h = $52.42 of VM. Sum $80.68. The $0.15 jobs rate and the 0.69 DBU/h rating are the catalog values cited in [RESEARCH.md](./RESEARCH.md).

## FinOps — where can we cut spend?

Starting point: notebooks left on 14 hours, a fixed 6-node job with no spot, a classic medium warehouse pinned 24×7, 2 TB storage. No growth.

- This month: **$8,612**
- First 12 months: **$87,845 / $103,347 / $132,285**
- The high side is wider because the classic SQL VM rate is the $0.22 per DBU-hour assumption, and the page says so.
- The warehouse is **$7,688** of the month (24 DBU/h × 728 h × $0.22, plus the VM assumption). 728 hours is 24 × 7 × 52/12.
- Applying “Stop the warehouse overnight” cuts the month to **$4,128** and the expected year to **$49,534**. The card’s saving was **$53,814** a year. The next cards stay, with new dollar amounts, including auto-stop on the 14-hour notebooks (**$2,675** before that apply) and spot on the job.

## Architect — classic or serverless for this job?

One classic job, m5.xlarge, 4 workers, 4 hours a day, 7 days a week. No growth.

- Classic: **$179.27** this month. The line is 5 nodes × 0.69 DBU/h × 121.3 h × $0.15/DBU, plus VM $0.192/h.
- First year: **$1,829 / $2,151 / $2,581**
- “Move classic jobs to serverless” is **$393.12** a year. After Apply the month is **$146.51**, the VM line is gone, and the note is 3.45 DBU/h × 121.3 h × $0.35/DBU. 3.45 is the same 5 × 0.69 DBU/h the classic job emitted. The rate changed from $0.15 to $0.35 and the VM bill dropped. That is the whole decision.
- Photon is listed only with the explicit “you measured a 2× speedup” assumption, at **$359.76** a year if that assumption holds.

## What is better than the other calculators

Compared again with the AWS Pricing Calculator, the Azure Pricing Calculator, the Google Cloud Pricing Calculator, and Databricks’ own instance calculator. Sources and the earlier table are in [RESEARCH.md](./RESEARCH.md) section 11.

- Those calculators price a cloud SKU, or a single Databricks instance’s DBUs. This page prices **DBU and VM on the same workload**, then a whole portfolio, and it drops the VM line only when the SKU is actually serverless.
- None of them turn “what will next year cost?” into a 12-month band with growth. This one does, and the band widens when a VM rate is a stand-in and tightens after a `system.billing.usage` import.
- Databricks’ calculator does not put classic against serverless with the VM removed, and it does not attach a dollar saving to auto-stop, spot, or a commit. Those are Apply buttons here, each computed by re-running the same estimate.
- The hyperscaler tools are better at full SKU coverage inside one cloud, and at looking like a procurement worksheet. This one does not pretend to be a quote, and it does not apply the Lakehouse Real-Time 30% promo to jobs or SQL.

## What was removed

The old Desk / Scenarios / Actuals / Method tabs asked the user to know the feature list. The scenarios are now the savings cards. Usage import and the method note sit on the same page as the number. Templates are behind “More starting points” so they stay available without being the front door.
