# Databricks cost model research

Current source-of-truth update: **2026-10-17, catalog and price book `2026-10-17.3`**. The shared resolver now prefers captured first-party Databricks price cards/calculator data and exact Azure Retail Prices meters. All 530 mapped Azure DBU rows across 39 supported regions were fetched with per-meter observation dates and IDs. First-party source captures, fingerprints, accepted prices, and quarantined disagreements are recorded in `data/databricks-dbu-rates.json` and `data/sources/`.

[Unit-cost evidence and maintenance](UNIT-COSTS.md) defines current source precedence, numeric evidence levels, review versus observation dates, and coverage limits. `npm run check:sources` replays the retained first-party captures, and `npm run check:unit-costs` verifies CSV/JSON outputs. UI, forecast, CLI, and Excel share the same resolver. Negotiated or imported customer prices retain their own provenance.

The sections below document the original research and fallback assumptions. Older claims that no first-party price JSON exists and secondary reference tables are authoritative are superseded by the captured official sources. The legacy reference table remains a fallback where no qualified official match exists. First-party disagreements do not justify inventing a replacement rate; those components remain unresolved. Every total is an estimate, not a quote.

## 1. How Databricks bills

A workload on classic compute produces **two bills**:

1. **Databricks Units (DBUs)** paid to Databricks (or, on Azure, to Microsoft as part of the Azure bill). A DBU is a normalized unit of processing. Metering is per second. Consumption depends on instance size, node count, runtime features (Photon), and how long the nodes are up.
2. **Cloud infrastructure** paid to AWS, Azure, or GCP: VM hours, disks, object storage, public IPs, NAT, and egress. Serverless Databricks SKUs **include** the compute in the DBU rate. Storage and networking are still extra on every cloud.

Formula used by this project:

```
monthly DBUs     = nodes × DBU/hour × hours
DBU cost         = DBUs × list $/DBU × (1 − commitment discount) × region factor
cloud VM cost    = nodes × $/hour × hours × (on-demand share + spot share × (1 − spot discount))
                   × (1 − cloud commitment discount)
total            = DBU cost + cloud VM cost + storage + egress + add-ons
```

Serverless, model serving, Foundation Model APIs, AI Search, and Lakebase skip the VM term (or replace it with a capacity-unit term). SQL Classic and SQL Pro keep the VM term. SQL Serverless does not.

Official definition: [Databricks pricing FAQ](https://www.databricks.com/product/pricing) (fetched 2026-10-15). A DSU is the storage analogue. One GB for transfer is 2^30 bytes.

### What the official calculator leaves out

Databricks publishes an interactive instance-type calculator at [databricks.com/product/instance-types](https://www.databricks.com/product/instance-types) and product price pages such as [Lakeflow Jobs](https://www.databricks.com/product/pricing/lakeflow-jobs). A static fetch of those pages on 2026-10-15 returned the tier/region chrome and **not** the numeric rate (prices are injected client-side). Secondary write-ups of that calculator (Flexera / Chaos Genius, 2026 guide) describe the same limits we want to beat:

- It prices **DBUs only**. VM, disk, storage, and egress are absent. Infra is often 50–100% of the DBU line for classic compute.
- It is a **single-cluster snapshot** (day/month), not a portfolio of jobs, warehouses, pipelines, and serving endpoints.
- It has no 12–36 month path, growth, seasonality, or side-by-side commitment cases.
- It does not ingest `system.billing.usage`.

Sources: [Flexera, Databricks pricing guide (2026)](https://www.flexera.com/blog/finops/databricks-pricing-guide/); [Databricks cost-management blog](https://www.databricks.com/blog/best-practices-cost-management-databricks).

## 2. Tiers

| Tier       | Status on 2026-10-15                                                                                                                                          | Notes                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standard   | Retired on AWS and GCP in October 2025. On Azure, new Standard workspaces blocked 2026-04-01; remaining Standard workspaces upgrade to Premium by 2026-10-01. | Do not offer Standard as a default. Optional legacy rates only if a user is modeling a pre-migration bill.                                                    |
| Premium    | Default for new AWS and GCP accounts. On Azure, Premium is the published plan.                                                                                | Includes Unity Catalog, SQL, serverless, audit, Mosaic AI.                                                                                                    |
| Enterprise | Sold by Databricks on AWS and GCP. Negotiated, but several list deltas are published by secondary sources.                                                    | Roughly +15–35% on interactive and jobs SKUs. **SQL Classic / Pro / Serverless list rates are the same on Premium and Enterprise** in the compilations below. |

**Naming trap:** Azure Premium is the feature equivalent of AWS/GCP Enterprise, but the **dollar rates are not the same**. Azure classic Jobs lists at about $0.30/DBU versus about $0.15 on AWS Premium and $0.20 on AWS Enterprise. The calculator must not map “Azure Premium” onto “AWS Enterprise” prices.

Sources: [Flexera 2026 guide](https://www.flexera.com/blog/finops/databricks-pricing-guide/); [Licenseware wiki on tiers](https://wiki.licenseware.io/wiki/databricks-dbu-pricing-and-platform-tiers/); [Azure Databricks pricing](https://azure.microsoft.com/en-us/pricing/details/databricks/) (page structure verified 2026-10-15; dollar cells did not render).

## 3. Reference list rates (USD per DBU, US East / US Virginia)

Compiled from the Flexera 2026 guide, cross-checked against [LakeSentry](https://lakesentry.io/blog/databricks-pricing-explained/) and [OWOX](https://www.owox.com/blog/articles/databricks-pricing) where they overlap. Treat as **US East reference list**, before region factor, commitment, or promotion. `—` means the secondary sources did not publish a separate Enterprise column because Azure has one published plan.

| SKU                                                                  | AWS Premium | AWS Enterprise | Azure Premium | GCP Premium | GCP Enterprise | VM bill? |
| -------------------------------------------------------------------- | ----------: | -------------: | ------------: | ----------: | -------------: | -------- |
| Jobs classic                                                         |        0.15 |           0.20 |          0.30 |        0.15 |           0.20 | Yes      |
| Jobs serverless                                                      |        0.35 |           0.45 |          0.45 |        0.35 |           0.45 | No       |
| All-purpose classic                                                  |        0.55 |           0.65 |          0.55 |        0.55 |           0.65 | Yes      |
| All-purpose / notebooks serverless                                   |        0.75 |           0.95 |          0.95 |        0.75 |           0.95 | No       |
| Lakeflow pipelines Core                                              |        0.20 |           0.20 |          0.30 |        0.20 |           0.20 | Yes      |
| Lakeflow pipelines Pro                                               |        0.25 |           0.25 |          0.38 |        0.25 |           0.25 | Yes      |
| Lakeflow pipelines Advanced                                          |        0.36 |           0.36 |          0.54 |        0.36 |           0.36 | Yes      |
| Lakeflow pipelines serverless                                        |        0.35 |           0.45 |          0.45 |        0.35 |           0.45 | No       |
| SQL Classic                                                          |        0.22 |           0.22 |          0.22 |        0.22 |           0.22 | Yes      |
| SQL Pro                                                              |        0.55 |           0.55 |          0.55 |        0.55 |           0.55 | Yes      |
| SQL Serverless                                                       |        0.70 |           0.70 |          0.70 |        0.70 |           0.70 | No       |
| Model serving (CPU and GPU)                                          |       0.070 |          0.070 |         0.070 |       0.070 |          0.070 | No       |
| Model training                                                       |        0.65 |           0.65 |          0.65 |        0.65 |           0.65 | No       |
| Databricks Apps                                                      |        0.75 |           0.95 |          0.95 |        0.75 |           0.95 | No       |
| Managed services (predictive optimization, DQ, FGAC, classification) |        0.35 |           0.45 |          0.45 |        0.35 |           0.45 | No       |
| Lakeflow Connect                                                     |        0.35 |           0.45 |          0.45 |        0.35 |           0.45 | No       |

Managed storage (per DSU): about **$0.023** on AWS and GCP, **$0.026** on Azure (Flexera). 1 GB-month of managed data ≈ 1 DSU. Azure docs also publish operation multipliers (about 0.3535 DSU per 1,000 writes and 0.0226 DSU per 1,000 reads).

Jobs Light is **$0.22/DBU** on the Azure Retail Prices API for East US Premium (meter “Premium Jobs Light Compute DBU”, fetched 2026-10-16). It is still absent from the AWS and GCP secondary tables, so the calculator does not offer it as a template.

**Promotions called out on the Azure page (2026-10-15), not baked into the default rates:** serverless real-time inference promotional pricing through 2027-01-31; Genie 150 free DBUs/month and a 25% promo through 2027-01-31; Mission Critical add-on 50% promo until 2027-06-30. AI Parse Document on Microsoft Learn notes a 50% promo through 2026-06-30. That date has passed. The catalog midpoint does not apply the discount. The engine should keep a `promotions[]` list separate from list rates so a refresh can expire them. Re-checked 2026-10-17: the Genie window is still open, and the Zerobus launch promotion is still undated and still not applied.

## 4. Instance DBU ratings

DBU **count** per node-hour is a property of the instance, not of the dollar rate. Dollar rate is chosen by SKU (Jobs vs All-Purpose vs pipeline edition). The same `m5.xlarge` emits the same DBUs/hour on Jobs and All-Purpose; All-Purpose just costs more per DBU.

The public instance picker ([databricks.com/product/instance-types](https://www.databricks.com/product/instance-types)) did not return numbers to a static fetch, and the [website terms of use](https://www.databricks.com/legal/terms-of-use) forbid scrapers. The Azure rows below that Microsoft publishes are taken from the instance tables on the [Azure Databricks pricing page](https://azure.microsoft.com/en-us/pricing/details/databricks/) (fetched 2026-10-16). The first tables are `data-filter="all-purpose-compute-premium"`. The same DBU counts are repeated for Jobs Compute and Jobs Light Compute. Photon tables on that page are higher and are not the figures stored here. AWS and GCP rows are a manual table: no allowed public feed publishes a per-instance DBU count for those clouds.

| Cloud | Instance         | vCPU | Memory (GiB) | DBU / hour |
| ----- | ---------------- | ---: | -----------: | ---------: |
| AWS   | m5.xlarge        |    4 |           16 |       0.69 |
| AWS   | m5.2xlarge       |    8 |           32 |       1.37 |
| AWS   | m5d.large        |    2 |            8 |       0.34 |
| AWS   | i3.xlarge        |    4 |         30.5 |       1.00 |
| AWS   | r5d.xlarge       |    4 |           32 |       0.90 |
| Azure | Standard_DS3_v2  |    4 |           14 |       0.75 |
| Azure | Standard_DS4_v2  |    8 |           28 |       1.50 |
| Azure | Standard_DS13_v2 |    8 |           56 |       2.00 |
| Azure | Standard_D4s_v5  |    4 |           16 |       1.00 |
| Azure | Standard_E8s_v3  |    8 |           64 |       2.00 |
| GCP   | n1-standard-4    |    4 |           15 |       0.71 |
| GCP   | n2-standard-4    |    4 |           16 |       0.72 |
| GCP   | n2d-standard-8   |    8 |           32 |       1.44 |

Worked Azure example printed on the pricing page (numbers did render in the FAQ, unlike the dollar cells): 10 × DS13v2 for 1h10m at 2.0 DBU/node and **$0.30/DBU** Jobs = $7 DBU, plus 2.5h × 10 × $0.598 VM = $14.95, total $21.95. That 2.0 DBU count matches the Jobs Compute instance table, and that $0.30 Jobs rate matches the East US meter. Source: [Azure Databricks pricing](https://azure.microsoft.com/en-us/pricing/details/databricks/). On 2026-10-16 the Retail Prices API listed Linux East US DS13 v2 at **$0.741/hour**, so the catalog follows the API and treats $0.598 as a stale FAQ example.

`Standard_F4s_v2` (0.75 DBU/hour in the catalog) does not appear in the Azure instance tables fetched on 2026-10-16. It stays in the manual table and is labeled as such in `data/instances.json`. The other curated Azure counts match the non-Photon tables.

The catalog ships a **curated** instance set, not a dump of every SKU. VM $/hour is filled from the public cloud APIs (section 10) and is refreshed independently of DBU/hour. The refresh script does not rewrite `data/instances.json`.

## 5. SQL warehouse t-shirt sizes

Published by Microsoft for Azure Databricks and used by Databricks on AWS and GCP as the same DBU ladder. Photon is included; **do not apply an extra Photon multiplier**.

| Size     | DBU / hour |
| -------- | ---------: |
| 2X-Small |          4 |
| X-Small  |          6 |
| Small    |         12 |
| Medium   |         24 |
| Large    |         40 |
| X-Large  |         80 |
| 2X-Large |        144 |
| 3X-Large |        272 |
| 4X-Large |        528 |

Source: [Serverless DBU consumption by SKU](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing) (fetched 2026-10-15). The Azure price page repeats this ladder for SQL Pro (DBU + VM) and Serverless SQL (DBU only).

Classic and Pro: multiply DBU/hour by the SQL Classic or SQL Pro rate, then add the underlying VM. Databricks does not publish a stable “one VM type per t-shirt” on the static page. The calculator should use a documented equivalent (for example Medium ≈ one memory-optimized node at 24 DBU/hour, scaled by size) and label it `assumedVmEquivalence`, so users can override the VM $/hour. Serverless SQL is `DBU/hour × $0.70 × hours` in US East, compute included.

Startup behavior matters for forecasts: serverless SQL is typically a few seconds; classic and pro are on the order of four minutes ([SQL warehouse types](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-types)). A warehouse left at min size overnight dominates a bursty BI forecast. The schedule model must allow min and max clusters plus an average utilization between them.

## 6. Photon

Photon is on by default for serverless compute, SQL warehouses, and serverless Lakeflow pipelines. For classic jobs, all-purpose, and classic pipelines it is optional and **raises DBU emission**, not the $/DBU of the parent SKU (Flexera lists “Classic Jobs with Photon” at the same $0.15 as classic Jobs on AWS Premium).

What is actually published:

- Azure Lakeflow pipeline feature table: “Photon — DBU emission rate **2.9×** vs non-Photon” ([Azure pricing page](https://azure.microsoft.com/en-us/pricing/details/databricks/), 2026-10-15).
- Photon docs: Photon instance types “consume DBUs at a different rate” and point at the pricing page ([What is Photon?](https://docs.databricks.com/aws/en/compute/photon)).
- The same Azure page’s instance tables, fetched 2026-10-16, print Photon DBU counts directly. All-Purpose with Photon is 2× the non-Photon count (DS3 v2 0.75 → 1.50, DS13 v2 2.00 → 4.00). Jobs Compute with Photon is 2.5× (DS3 v2 0.75 → 1.88, DS13 v2 2.00 → 5.00).

**Calculator rule, corrected 2026-10-17:** Azure classic Jobs uses **2.5×** DBU/hour and All-Purpose uses **2×**; classic pipelines retain **2.9×**. AWS/GCP classic Jobs and pipelines retain the 2.9× planning factor; All-Purpose uses the approximately 2× factor discussed by Databricks. These remain workload-level assumptions where exact instance ratings are unavailable. See `rates/photon.ts`, the [Azure tables](https://azure.microsoft.com/en-us/pricing/details/databricks/), and [Databricks cost-maturity guidance](https://www.databricks.com/blog/chaos-control-cost-maturity-journey-databricks). Serverless and SQL do not receive another multiplier. A runtime speedup remains a separate user assumption.

## 7. Spot versus on-demand

Spot (AWS), Spot VMs (Azure), and preemptible VMs (GCP) discount the **cloud VM line only**. DBU rates do not change. Drivers and SQL warehouses should stay on demand in the default templates. Workers on interruptible jobs can take a spot mix.

Published “up to 60–90%” marketing is too wide to hard-code as truth. The engine should take `spotShare` (0–1 of worker hours) and `spotDiscount` (default **0.60**, user-editable, tagged as an assumption). A 70% spot worker fleet is not 70% off the whole bill: the driver, the DBU line, storage, and egress stay put. That split is one of the charts.

## 8. Commitments (DBCU and cloud)

Azure documents Databricks Commit Units: pre-purchase DBUs for 1 or 3 years, draw-down at the list DBU price, **up to 37%** versus pay-as-you-go. One-year tiers start at 12,500 DBCU and run through 2,000,000. Three-year tiers start at 37,500 and run through 6,000,000. The discount percent per tier did **not** render in the static fetch (cells were `$-`). Source: [Azure Databricks pricing, pre-purchase plan](https://azure.microsoft.com/en-us/pricing/details/databricks/).

Databricks’ own FAQ describes committed-use contracts with larger discounts for larger commitments, usable across clouds, and says to contact sales for the schedule ([pricing FAQ](https://www.databricks.com/product/pricing)). There is no public discount API.

**Calculator rule:** commitment is a scenario input, not a hidden rate.

- Presets on the DBU line: 0%, 15%, 25%, 37% (the Azure-published ceiling). Custom percent allowed.
- A separate cloud-commitment percent applies only to on-demand VM hours (AWS Savings Plans / Reserved, Azure reservations, GCP committed use). Default 0%. Spot hours do not also take the reserved discount.
- The forecast shows pay-as-you-go versus commitment as two series, and flags that unused commit is sunk: a 37% DBU discount on a falling workload can raise total cost.

Add-ons, modeled as a percent of workspace DBU spend because that is how Azure publishes them:

- Enhanced Security and Compliance: **+10%** of list product spend in the workspace.
- Mission Critical (includes that compliance add-on plus managed DR): **+30%** before the time-limited promo.

## 9. Product-specific consumption

### Model serving

Microsoft Learn, Serverless Real-Time Inference SKU (fetched 2026-10-15):

- CPU: **1 concurrent request-hour = 1 DBU**. At $0.07/DBU that is $0.07 per concurrency-hour.
- GPU DBU/hour (Learn): T4 small 10.48; A100 80GB ×1 78.60; ×2 157.20; ×4 314.40.
- The Databricks [model serving price page](https://www.databricks.com/product/pricing/model-serving) (fetched 2026-10-15) adds T4 10.48, A10G 20.00 (4-GPU 112.00, 8-GPU 290.80), L40S 44.86, A100 40GB ×8 538.40, A100 80GB ×8 628.00, RTX PRO 6000 80.00, H100 ×1 100.00, H100 ×8 800.00. The ×8 A100 80GB figure (628) matches 8 × 78.5, consistent with Learn’s per-GPU rate.
- Inference tables: 7.143 DBU per GB of payload. Usage tracking: 1.429 DBU per GB.

Scale-to-zero is the main forecast lever. The workload editor should ask for endpoint replicas, hours active per day, and (for CPU) average concurrency, not a 24×7 assumption.

### Foundation Model APIs

Learn publishes **DBU per million tokens**, not dollars. Multiplying by the $0.07 model-serving rate reproduces the $0.50 / $1.50 per million input/output tokens quoted for Llama-class models in the Flexera guide (7.143 × 0.07 = 0.50; 21.429 × 0.07 = 1.50). Examples from Learn:

| Model            | DBU / 1M input | DBU / 1M output | Provisioned DBU / hour |
| ---------------- | -------------: | --------------: | ---------------------: |
| Llama 4 Maverick |          7.143 |          21.429 |                 85.714 |
| Llama 3.3 70B    |          7.143 |          21.429 |                 85.714 |
| Llama 3.1 8B     |          2.143 |           6.429 |                 53.571 |
| GPT OSS 20B      |          1.000 |           4.286 |                 53.571 |
| GTE (embeddings) |          1.857 |               — |                 20.000 |
| BGE Large        |          1.429 |               — |                 24.000 |

The live [Foundation Model Serving](https://www.databricks.com/product/pricing/foundation-model-serving) page (fetched 2026-10-15) has a longer model list (Kimi, GLM, DeepSeek, Qwen, and others) plus cache-read columns and 1-month / 3-month provisioned reservations. Regional processing adds about 10% for models marked on that page. The JSON catalog should store DBU-per-million (and cache rates where known) so a $/DBU change reprices every model. The UI ships a short curated list, not every row.

### AI Search (Vector Search)

Learn: Standard **4.00 DBU/hour** per unit (about 2M vectors at dim 768); Storage Optimized **18.29 DBU/hour** (about 64M). Databricks’ [AI Search price page](https://www.databricks.com/product/pricing/ai-search) shows effective US East prices of **$0.28** and **$1.28** per unit-hour, which is those DBU rates × $0.07. An example on that page: 5M vectors → 3 standard units × 720h × 4 DBU = 8,640 DBU × $0.07 = $605 in US East, and a higher $/DBU in Sydney ($0.088).

Storage is separate (Flexera: standard about $0.23/GB-month on AWS after 30 GB free; storage-optimized about $0.046/GB-month). Sync mode matters: continuous sync keeps a stream running; triggered sync is cheaper ([AI Search cost management](https://docs.databricks.com/aws/en/ai-search/cost-management)).

### Databricks Apps

Learn, Interactive Serverless multipliers: Apps **Medium 0.5×**, **Large 1×**. Dollar rates in Flexera match interactive serverless ($0.75 AWS Premium, $0.95 AWS Enterprise and Azure). Bill `sizeMultiplier × hours × interactive serverless $/DBU`. Apps do not add a customer VM line.

### Lakebase

Two published models, and they disagree enough that the UI must label the assumption:

- Flexera: AWS Premium preview **$0.0092 per CU-hour** and $0.345/GB-month; AWS Enterprise and Azure Premium **$0.111 per CU-hour** (Azure storage $0.390/GB-month). The $0.0092 figure is explicitly called preview and “verify before budgeting.”
- Microsoft Learn: Lakebase autoscaling compute is **0.213×** the Database Serverless SKU, and database storage is **15×** the DSU rate.
- Azure Retail Prices, East US, 2026-10-16: **Premium Database Serverless Compute DBU is $0.26 per DBU-hour**. Premium Databricks Storage is **$0.026 per DSU**, so 15× storage is **$0.39/GB-month**, which matches the Flexera Azure storage figure already in the catalog.

Default in the catalog: Azure compute is **0.213 × $0.26 = $0.05538 per CU-hour**, and Azure storage stays **$0.39/GB-month**. AWS stays at the Flexera Enterprise figure of **$0.111 per CU-hour** because there is no equivalent public meter. The $0.0092 preview is not the default. GCP stays unpriced.

### Storage and egress

- Managed Databricks storage: DSU rates in section 3. Customer-owned S3, ADLS, and GCS are **not** DSU; they are cloud list prices. The calculator includes a simple object-storage line (GB-month) using a refreshed or pinned $/GB so both show up.
- Egress is cloud-specific and tiered. A honest default for the first version is a single user-editable $/GB (seeded near the common US East internet-egress list, on the order of $0.09/GB after a free allotment on AWS) plus a GB/month input. Cross-region and cross-AZ are called out in tips, not fully tariffed. Private connectivity is hourly plus per-GB on serverless; leave it as an optional add-on line rather than pretending to enumerate every endpoint SKU.

### Serverless multipliers (official, not a higher $/DBU)

[Microsoft Learn, serverless DBU consumption](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing) (fetched 2026-10-15) bills features as multipliers on a SKU, and the usage table already contains the multiplied DBUs:

| SKU                    | Feature                                                                                                                                                       | Multiplier                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Automated Serverless   | Serverless Jobs, serverless Spark Declarative Pipelines, predictive optimization, fine-grained access control, materialized views and streaming tables in SQL | 1×                            |
| Automated Serverless   | Data Quality Monitoring                                                                                                                                       | 2×                            |
| Automated Serverless   | Data Classification                                                                                                                                           | 3×                            |
| Interactive Serverless | Serverless notebooks                                                                                                                                          | 1×                            |
| Interactive Serverless | Databricks Apps, medium compute-hour                                                                                                                          | 0.5×                          |
| Interactive Serverless | Databricks Apps, large compute-hour                                                                                                                           | 1×                            |
| Database Serverless    | Lakebase autoscaling compute                                                                                                                                  | 0.213×                        |
| Databricks Storage     | Database storage                                                                                                                                              | 15× DSU                       |
| Databricks Storage     | Point-in-time restore                                                                                                                                         | 8.7× DSU                      |
| Databricks Storage     | Snapshots                                                                                                                                                     | 3.91× DSU                     |
| Databricks Storage     | AI Search storage                                                                                                                                             | 10× DSU                       |
| Databricks Storage     | Per GB stored / 1,000 writes / 1,000 reads                                                                                                                    | 1× / 0.3535× / 0.0226×        |
| Model Serving          | AI Gateway inference tables                                                                                                                                   | 7.143 DBU per GB of payload   |
| Model Serving          | AI Gateway usage tracking                                                                                                                                     | 1.429 DBU per GB of payload   |
| Model Serving          | AI Search reranker                                                                                                                                            | 28.571 DBU per 1,000 requests |
| Model Serving          | Shutterstock Image AI                                                                                                                                         | 0.857 DBU per image           |
| Model Training         | Forecasting                                                                                                                                                   | 4×                            |

The same page prices model training at **$0.65/DBU in US East** in the fine-tuning cost column (Llama 3.3 70B, 10M words ≈ 225 DBU ≈ $146.25). That is a first-party dollar rate, not a secondary compilation. AI Parse Document is estimated at 10–90 DBU per page before a 50% promo through 2026-06-30.

The “managed services” dollar rate in the catalog is the $/DBU, not the multiplier. The metered editor asks for DBUs after the multiplier.

### Region factors

DBU list price is not flat. Two first-party regional tables were fetched on 2026-10-15.

**AWS Lakehouse Real-Time** ([docs](https://docs.databricks.com/aws/en/compute/sql-warehouse/real-time-pricing), updated 2026-10-08), SKU `LAKEHOUSE_SERVERLESS_COMPUTE`. Every published region is in the catalog. The factor is Premium $/DBU ÷ $0.55 (us-east-1), stored to 6 decimals.

| Region                    | Code           | Premium | Enterprise |   Factor |
| ------------------------- | -------------- | ------: | ---------: | -------: |
| US East (N. Virginia)     | us-east-1      |    0.55 |       0.70 |        1 |
| US East (Ohio)            | us-east-2      |    0.55 |       0.70 |        1 |
| US West (Oregon)          | us-west-2      |    0.55 |       0.70 |        1 |
| US West (N. California)   | us-west-1      |    0.64 |       0.82 | 1.163636 |
| Canada (Central)          | ca-central-1   |    0.61 |       0.78 | 1.109091 |
| Europe (Ireland)          | eu-west-1      |    0.61 |       0.78 | 1.109091 |
| Europe (London)           | eu-west-2      |    0.64 |       0.81 | 1.163636 |
| Europe (Paris)            | eu-west-3      |    0.64 |       0.82 | 1.163636 |
| Europe (Frankfurt)        | eu-central-1   |    0.66 |       0.84 | 1.200000 |
| Asia Pacific (Mumbai)     | ap-south-1     |    0.58 |       0.74 | 1.054545 |
| Asia Pacific (Seoul)      | ap-northeast-2 |    0.68 |       0.86 | 1.236364 |
| Asia Pacific (Singapore)  | ap-southeast-1 |    0.69 |       0.88 | 1.254545 |
| Asia Pacific (Sydney)     | ap-southeast-2 |    0.69 |       0.88 | 1.254545 |
| Asia Pacific (Jakarta)    | ap-southeast-3 |    0.69 |       0.88 | 1.254545 |
| Asia Pacific (Tokyo)      | ap-northeast-1 |    0.71 |       0.90 | 1.290909 |
| South America (São Paulo) | sa-east-1      |    0.87 |       1.11 | 1.581818 |

Enterprise on that page is about 1.27× Premium in each region, so one factor applied to the already-tiered US East rate stays close. The AI Search page independently shows Sydney above US East ($0.088 vs $0.07 per DBU in the worked example).

**Azure Lakehouse Real-Time** ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/databricks/compute/sql-warehouse/real-time-pricing), fetched 2026-10-15). Until 2026-10-10 this SKU billed at serverless SQL rates. From 2026-10-10 it bills the regional Premium rates below. Azure publishes no Enterprise column on this page. The catalog factor is the published $/DBU ÷ $0.70 (East US). All 39 regions are stored.

| Region                                                                 | Code                                                              | $/DBU |   Factor |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ----: | -------: |
| East US, East US 2, North Central US, West US 2, West US 3             | eastus, eastus2, northcentralus, westus2, westus3                 |  0.70 |        1 |
| Central India, Sweden Central                                          | centralindia, swedencentral                                       |  0.74 | 1.057143 |
| Mexico Central                                                         | mexicocentral                                                     |  0.77 | 1.100000 |
| Canada Central, Canada East, Malaysia West, North Europe               | canadacentral, canadaeast, malaysiawest, northeurope              |  0.78 | 1.114286 |
| Central US                                                             | centralus                                                         |  0.79 | 1.128571 |
| UK South                                                               | uksouth                                                           |  0.81 | 1.157143 |
| France Central, West US                                                | francecentral, westus                                             |  0.82 | 1.171429 |
| Germany West Central, West Europe                                      | germanywestcentral, westeurope                                    |  0.83 | 1.185714 |
| South Central US, West Central US                                      | southcentralus, westcentralus                                     |  0.84 | 1.200000 |
| UAE North, UK West                                                     | uaenorth, ukwest                                                  |  0.85 | 1.214286 |
| Qatar Central                                                          | qatarcentral                                                      |  0.86 | 1.228571 |
| Australia Central, Australia Central 2, Australia East, Southeast Asia | australiacentral, australiacentral2, australiaeast, southeastasia |  0.88 | 1.257143 |
| Australia Southeast, Korea Central                                     | australiasoutheast, koreacentral                                  |  0.91 | 1.300000 |
| Japan East, Japan West, West India                                     | japaneast, japanwest, westindia                                   |  0.90 | 1.285714 |
| East Asia                                                              | eastasia                                                          |  0.96 | 1.371429 |
| South Africa North                                                     | southafricanorth                                                  |  0.98 | 1.400000 |
| South India                                                            | southindia                                                        |  0.99 | 1.414286 |
| Norway East                                                            | norwayeast                                                        |  1.00 | 1.428571 |
| Switzerland North                                                      | switzerlandnorth                                                  |  1.09 | 1.557143 |
| Brazil South                                                           | brazilsouth                                                       |  1.11 | 1.585714 |
| Switzerland West                                                       | switzerlandwest                                                   |  1.42 | 2.028571 |

Both clouds offer a **30% introductory emission discount through 2027-01-31** on Lakehouse Real-Time only (10 DBUs billed as 7). The calculator does not apply it. It is not a discount on jobs, classic SQL, or model serving, and applying it to a whole portfolio would understate those lines.

**GCP:** no equivalent first-party regional DBU table was found on 2026-10-15. Non-reference GCP factors stay labeled `proxy`.

**Calculator rule:** store US East list rates and multiply by the region factor. Label the factor `proxy-lakehouse-rt` when the ratio is real for Lakehouse Real-Time and only a proxy for the SKU being priced. Users who pick the reference region get factor 1.

## 10. Public price APIs

| Source                        | Endpoint                                                                                                                                                                                                                                                                                                    | Auth                                     | Use in this repo                                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS Price List **bulk files** | `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json` and `.../AmazonEC2/current/<region>/index.json` (also CSV). Docs: [fetching price list files](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-the-aws-price-list-bulk-api-fetching-price-list-files-manually.html). | None for the offer files                 | Refresh EC2 Linux on-demand $/hour for the curated instance list. Files are large; filter to the instance IDs we ship.                                                                                                                                                          |
| AWS Price List **Query API**  | `https://api.pricing.us-east-1.amazonaws.com` (also eu-central-1, ap-south-1)                                                                                                                                                                                                                               | AWS credentials                          | Skip in GitHub Actions. No long-lived keys in this public repo.                                                                                                                                                                                                                 |
| Azure Retail Prices           | `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview` with OData `$filter`                                                                                                                                                                                                            | None                                     | Best unauthenticated API. Refresh VM retail, spot, and 1-year/3-year reservation meters. Filter `serviceName eq 'Virtual Machines'` and `armRegionName`. The weekly refresh stores Premium DBU meters for every catalog region in `data/azure-dbu-meters.json`. See section 16. |
| GCP Cloud Billing Catalog     | `https://cloudbilling.googleapis.com/v1/services/<id>/skus?key=API_KEY`                                                                                                                                                                                                                                     | API key                                  | Do not require a key for the default Action. Ship pinned GCE on-demand rates and refresh only when `GCP_BILLING_API_KEY` is set as an Actions secret.                                                                                                                           |
| GCP Pricing API v2            | account-specific SKU prices                                                                                                                                                                                                                                                                                 | Billing account credentials              | Out of scope. Contract prices are not public.                                                                                                                                                                                                                                   |
| Databricks public price API   | Probed 2026-10-16. No rate JSON.                                                                                                                                                                                                                                                                            | —                                        | Product pages are a client bundle. The site terms forbid scraping it. The curated $/DBU table stays. See section 16.                                                                                                                                                            |
| `system.billing.list_prices`  | In-workspace table                                                                                                                                                                                                                                                                                          | Account admin / system-table entitlement | Historical SKU list and promotional price. Not callable from GitHub Actions.                                                                                                                                                                                                    |
| `system.billing.usage`        | In-workspace table                                                                                                                                                                                                                                                                                          | Same                                     | 365-day billable usage. The app imports a **CSV export** of this table; it does not connect to a workspace.                                                                                                                                                                     |

`list_prices.pricing` is a struct: `default` (published list), `promotional`, and `effective_list` (what to multiply by `usage_quantity`). Join on `sku_name` and `usage_end_time` inside `[price_start_time, price_end_time)`. Usage columns the importer should accept, from the [billing table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing) (updated 2026-10-08): `sku_name`, `cloud`, `usage_date`, `usage_quantity`, `usage_unit`, `billing_origin_product`, `usage_metadata`, `record_type`. Sum `ORIGINAL` plus later corrections (`RETRACTION` is negative). Do not treat the CSV as a price list. A one-month file scales the forecast (that month becomes month 0). A file with six or more months keeps the last month as the level and fits a path; the rows are not summed into one basket. Cloud VM dollars are not in this table. The query to export is `docs/usage-export.sql`.

## 11. Hyperscaler calculators, and the gap

Compared on 2026-10-15 from [AWS calculator assumptions](https://aws.amazon.com/calculator/calculator-assumptions/), the [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/), [Google Cloud pricing calculator](https://cloud.google.com/products/calculator), and the secondary comparison [Tech Insider, 2026](https://tech-insider.org/au/aws-azure-gcp-pricing-calculator-2026/).

|                                   | AWS Pricing Calculator               | Azure Pricing Calculator                                                                                                          | GCP Pricing Calculator                | Databricks instance calculator | This project                             |
| --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------ | ---------------------------------------- |
| No login to estimate              | Yes                                  | Yes                                                                                                                               | Yes (saving wants a Google account)   | Yes                            | Yes                                      |
| Share link                        | Yes                                  | Yes                                                                                                                               | Yes                                   | No portfolio link              | URL state                                |
| Export                            | CSV                                  | Excel                                                                                                                             | PDF / email                           | No                             | CSV, XLSX, JSON, PDF                     |
| Databricks DBU + VM together      | No Databricks model                  | Azure Databricks service exists; rates often blank until the page’s own scripts run; still a single configuration, not a forecast | No DBU model (DBUs are not a GCP SKU) | DBU only                       | Both                                     |
| Commitments                       | RI and Savings Plans, off by default | Reservations, savings plans                                                                                                       | CUD, sustained use                    | “Contact us”                   | Apply a commit and see the dollar change |
| Growth, seasonality, 12–36 months | No                                   | No                                                                                                                                | No                                    | No                             | Yes                                      |
| Actuals in, forecast out          | No                                   | No                                                                                                                                | No                                    | No                             | `system.billing.usage` CSV               |
| Public rate refresh               | Bulk files, no key                   | Retail Prices API, no key                                                                                                         | Catalog needs a key                   | None                           | Scheduled Action                         |

They are good at SKU coverage inside one cloud and at producing a number a procurement reviewer recognizes. They are weak at the thing a Databricks owner actually decides: classic versus serverless, Photon on or off, jobs versus all-purpose, spot mix, and whether a commit still pays off if the platform grows 8% a quarter and SQL drops every January. AWS’s own assumptions page says the calculator is not a quote, ignores free tier and most credits, and mishandles tiered prices when you already have usage. We should copy that honesty, not the false precision.

## 12. MCP

Databricks ships **managed MCP servers** for workspace data: Genie, Genie One, Databricks SQL, AI Search, and Unity Catalog functions ([managed MCP](https://docs.databricks.com/aws/en/agents/mcp-tools/managed-mcp), [MCP overview](https://docs.databricks.com/aws/en/agents/mcp-tools/) updated 2026-10-08). They require a workspace URL and OAuth or a personal access token. They query customer data. They do not expose list prices or a forecast.

A custom MCP can be hosted on Databricks Apps ([custom MCP](https://docs.databricks.com/aws/en/agents/mcp-tools/custom-mcp)), which is the wrong place for a public pricing tool: it would bill the workspace and demand a login.

**Decision:** ship a small **stdio MCP server in this repo** (`/mcp`) that calls the same TypeScript pricing engine as the website. Tools: `list_skus`, `estimate_workload`, `forecast`, `compare_scenarios`, `forecast_usage`. No Databricks credentials, no customer data. A static GitHub Pages app cannot call the SQL Statement API from the browser. See section 16. Assistants that need live account usage should use Databricks SQL MCP against `system.billing.usage` and then pass the CSV into `forecast_usage`, or run `npm run cayfore`.

## 13. Rate sources (what the catalog stores, and who published it)

Every number in `data/sku-rates.json` and `data/instances.json` is one of these classes. “Official” means a first-party page returned the figure as text on 2026-10-15. “Secondary” means the official price page is a client-rendered app that returned no dollars to a static fetch, and the figure is taken from a 2026 compilation that cites those pages. Secondary dollars are estimates until a `system.billing.list_prices` export or a Retail Prices harvest replaces them.

| Catalog field                                                | Value basis                                                                                                                                                                           | Source class                                       | Source                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL DBU/hour ladder, 2X-Small through 4X-Large               | 4, 6, 12, 24, 40, 80, 144, 272, 528                                                                                                                                                   | Official                                           | [Microsoft Learn, serverless DBU consumption](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing)                                                                                                                                                                 |
| Photon multiplier default                                    | 2.9× classic DBU emission                                                                                                                                                             | Official                                           | [Azure Databricks pricing](https://azure.microsoft.com/en-us/pricing/details/databricks/), Lakeflow pipeline feature table                                                                                                                                                          |
| Jobs example, Azure                                          | DS13 v2 = 2.0 DBU, Jobs = $0.30/DBU, VM $0.598                                                                                                                                        | Official (FAQ arithmetic rendered)                 | Same Azure pricing page                                                                                                                                                                                                                                                             |
| DBCU ceiling                                                 | Up to 37% versus pay-as-you-go, 1- and 3-year tiers                                                                                                                                   | Official (percents per tier did not render)        | Same Azure pricing page, pre-purchase section                                                                                                                                                                                                                                       |
| Add-ons                                                      | Compliance +10% of product spend; mission critical +30%                                                                                                                               | Official                                           | Same Azure pricing page                                                                                                                                                                                                                                                             |
| CPU serving                                                  | 1 concurrent request-hour = 1 DBU                                                                                                                                                     | Official                                           | Microsoft Learn, Model Serving SKU                                                                                                                                                                                                                                                  |
| GPU serving DBU/hour                                         | T4 10.48, A10G 20, L40S 44.86, A100 80GB 78.60, H100 100, plus the multi-GPU rows on the product page                                                                                 | Official                                           | [Model serving pricing](https://www.databricks.com/product/pricing/model-serving) and Microsoft Learn                                                                                                                                                                               |
| Foundation model DBU per million tokens                      | Llama 4 Maverick 7.143 / 21.429, and the other rows in section 9                                                                                                                      | Official quantities                                | Microsoft Learn. Dollars = those DBUs × the $0.07 serving rate, which matches the $0.50 / $1.50 secondary quote                                                                                                                                                                     |
| AI Search DBU/hour                                           | Standard 4.00, storage-optimized 18.29                                                                                                                                                | Official                                           | Microsoft Learn and [AI Search pricing](https://www.databricks.com/product/pricing/ai-search)                                                                                                                                                                                       |
| AI Search US East $/hour                                     | $0.28 and $1.28 per unit-hour                                                                                                                                                         | Official (worked example on the product page)      | AI Search pricing page                                                                                                                                                                                                                                                              |
| Apps multipliers                                             | Medium 0.5×, Large 1× of interactive serverless                                                                                                                                       | Official                                           | Microsoft Learn, Interactive Serverless SKU                                                                                                                                                                                                                                         |
| Lakebase multiplier                                          | 0.213× database serverless; storage 15× DSU                                                                                                                                           | Official multiplier, not a dollar rate             | Microsoft Learn                                                                                                                                                                                                                                                                     |
| Model training $/DBU                                         | $0.65 US East, from the fine-tuning cost column (225 DBU ≈ $146.25)                                                                                                                   | Official                                           | [Microsoft Learn, serverless DBU consumption](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing)                                                                                                                                                                 |
| AWS region factors                                           | Premium Lakehouse Real-Time $/DBU ÷ $0.55, all 16 published regions                                                                                                                   | Official ratio, applied as a proxy to other SKUs   | [Lakehouse Real-Time pricing](https://docs.databricks.com/aws/en/compute/sql-warehouse/real-time-pricing), updated 2026-10-08                                                                                                                                                       |
| Azure region factors                                         | Lakehouse Real-Time Premium $/DBU ÷ $0.70, all 39 regions, effective 2026-10-10                                                                                                       | Official ratio, applied as a proxy to other SKUs   | [Azure Lakehouse Real-Time pricing](https://learn.microsoft.com/en-us/azure/databricks/compute/sql-warehouse/real-time-pricing)                                                                                                                                                     |
| Instance DBU/hour                                            | Curated non-Photon counts. Azure DS3 v2 0.75, DS4 v2 1.50, DS13 v2 2.00, D4s v5 1.00, E8s v3 2.00 are on the Microsoft page. F4s v2, and every AWS and GCP count, are a manual table. | Official for the five Azure rows; manual otherwise | [Azure Databricks pricing](https://azure.microsoft.com/en-us/pricing/details/databricks/), All-Purpose, Jobs, and Jobs Light instance tables, fetched 2026-10-16. The refresh does not overwrite `data/instances.json`.                                                             |
| $/DBU by SKU, cloud, and tier                                | Section 3 table                                                                                                                                                                       | Secondary, cross-checked where two guides agree    | [Flexera 2026 guide](https://www.flexera.com/blog/finops/databricks-pricing-guide/), [LakeSentry](https://lakesentry.io/blog/databricks-pricing-explained/), [OWOX](https://www.owox.com/blog/articles/databricks-pricing)                                                          |
| DSU $/unit, Lakebase $/CU-hour, object storage, egress seeds | Section 3 and section 9                                                                                                                                                               | Secondary or labeled assumption                    | Flexera for DSU and Lakebase dollars. Egress and object storage are editable assumptions, not a tariff                                                                                                                                                                              |
| VM $/hour                                                    | On-demand hourly, every catalog region                                                                                                                                                | Official for AWS and Azure; GCP seeds              | AWS rows are the public EC2 offer file (us-east-1 m5.xlarge still $0.192). Azure rows are the Retail Prices API (eastus DS13 v2 $0.741). Spot, when stored, is the Spot Instance advisor or the Azure Spot meter. GCP rows remain seeds until a billing key is set. See section 16. |
| GCP region factors other than the reference region           | Short proxy list                                                                                                                                                                      | Not a published tariff                             | Labeled `proxy` in the catalog. No first-party GCP regional DBU table was found on 2026-10-15                                                                                                                                                                                       |

No public unauthenticated Databricks rate endpoint was found (section 16). Azure Databricks DBU meters are in the Retail Prices API (sections 15 and 16). The AWS and GCP APIs in section 10 refresh VM rates. None of these APIs return a negotiated discount.

## 14. Implications for the catalog

- Version the JSON (`version`, `verifiedOn`, `source` per rate family).
- US East list rates in `data/sku-rates.json` are curated and reviewed by a human. The refresh does not rewrite that file. Azure regional meters and VM $/hour are machine-refreshed.
- Never present a total without the disclaimer and the catalog version.
- Region factors and the Photon multiplier are explicit inputs with documented defaults.
- Promotions are dated. Expired promos must not apply.
- AWS and GCP $/DBU stay on the secondary table. Azure Premium meters, where the region publishes one, replace the US East rate times the region factor for that SKU.

## 15. Re-check on 2026-10-16

Fetched the [Azure Retail Prices API](https://prices.azure.com/api/retail/prices) for East US (`armRegionName eq 'eastus'`). Forty-three Azure Databricks consumption meters came back in one page. The Premium dollar rates that the simple forecast and the advanced builder actually use matched the catalog and were left in place:

| Retail meter (Premium)                          |         $/DBU-hour | Catalog key                             |
| ----------------------------------------------- | -----------------: | --------------------------------------- |
| Jobs Compute, Jobs Compute Photon               |               0.30 | `jobs_classic`                          |
| Jobs Light Compute                              |               0.22 | not offered (Azure-only confirmation)   |
| All-purpose Compute, All-Purpose Photon         |               0.55 | `all_purpose_classic`                   |
| SQL Analytics                                   |               0.22 | `sql_classic`                           |
| SQL Compute Pro                                 |               0.55 | `sql_pro`                               |
| Serverless SQL                                  |               0.70 | `sql_serverless`                        |
| Automated Serverless Compute                    |               0.45 | `jobs_serverless`, `dlt_serverless`     |
| Interactive Serverless Compute                  |               0.95 | `all_purpose_serverless`, `apps`        |
| Core / Pro / Advanced Compute Delta Live Tables | 0.30 / 0.38 / 0.54 | `dlt_core` / `dlt_pro` / `dlt_advanced` |
| Model Training                                  |               0.65 | `model_training`                        |
| Serverless Realtime Inferencing                 |               0.07 | `model_serving`                         |
| Databricks Storage Unit                         |      0.026 per DSU | `managedStoragePerDsu.azure`            |
| Database Serverless Compute                     |               0.26 | parent of the Lakebase CU rate          |

Photon meters are the same $/DBU as the non-Photon meter. The catalog still multiplies DBU emission by 2.9 for classic Photon, which is the factor on the Azure pipeline table, not a higher price.

Two retail meters do **not** replace the add-on model. Enhanced Security and Compliance is $0.10 per DBU-hour, and the Mission Critical add-on is $0.15 per DBU-hour. The Azure pricing page still describes those products as +10% and +30% of product spend. The engine keeps the percentage, because a flat $0.10 is not 10% of a $0.30 Jobs rate. Promotions, including the Lakehouse Real-Time 30% emission discount through 2027-01-31, stay off.

AWS and GCP classic $/DBU pages still render in the browser. Those columns stay secondary (Flexera 2026, LakeSentry, OWOX) and were not edited. Foundation-model token DBUs and GPU DBU/hour counts stay on the Microsoft Learn and model-serving figures already in section 9. The Retail Prices API prices serving at $0.07/DBU; it does not publish a separate token meter. The AWS EC2 offer file was not re-downloaded in this pass. A later pass the same day did. GCP VM rows stay seeds. See section 16.

### Team presets

Dollar shares, not DBU shares. Pipelines are classic jobs on the cloud’s default instance (8 hours, 5 days), so they carry the VM line. Dashboards are a serverless SQL warehouse at size S, so they do not. Models are Llama 3.1 8B input tokens with output tokens at a quarter of the input, on the $0.07 serving rate, so they do not add a VM either. The basket is solved so list dollars match the typed monthly amount. A cloud or tier change keeps that basket and reprices it.

| Preset | Monthly list | Mix (pipelines / dashboards / models) | Why this amount                                                                                                                                                                                                                                    |
| ------ | -----------: | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small  |       $2,000 | 35% / 55% / 10%                       | Inside DoiT’s small-team range of $1,500–$3,000 a month including infrastructure, and inside the $1,800–$2,500 small-team range in the Cosmos 2026 breakdown. Dashboards are the larger share because that is the visible product of a small team. |
| Medium |      $12,000 | 45% / 40% / 15%                       | The top of DoiT’s “10 TB analytics team, $8,000–$12,000 including AWS infrastructure,” and inside their mid-size band of $5,000–$15,000. It is intentionally below the Cosmos multi-team platform range of $16,000–$22,000. Pipelines lead.        |
| Large  |      $25,000 | 40% / 30% / 30%                       | The starting monthly Databricks bill in the Similarweb engineering write-up (later cut to $12,500). A 30% model share is a real GenAI line at that bill, and it is still far under the $70,000–$90,000 enterprise estates in the Cosmos breakdown. |

Sources: [DoiT, Databricks pricing explained](https://www.doit.com/blog/databricks-pricing-explained-dbus-tiers-cost-control); [Cosmos, how much Databricks costs (2026)](https://cosmosthrace.com/resources/databricks/how-much-does-databricks-cost); [Similarweb Engineering, how we cut our Databricks costs by 50%](https://medium.com/similarweb-engineering/how-we-cut-our-databricks-costs-by-50-7c60d6b6c069).

These are sizing anchors, not a claim that the forecast reproduces anyone’s invoice. The year total is twelve months of list arithmetic on the three archetypes, plus growth, plus the uncertainty band. A one-month usage CSV replaces the monthly amount and the mix and tightens the band. A longer file replaces the growth path with a fitted series (section 16). The VM line is still inferred.

## 16. What is measured, and what is still an estimate (2026-10-16)

The pipeline, the files, and how to run it are in [DATA-PIPELINE.md](DATA-PIPELINE.md). This section records what that pass actually returned, and what the forecast still assumes.

### Databricks does not publish a price JSON

The pricing site is a client bundle. On 2026-10-16 the refresh fetched `https://www.databricks.com/en-pricing-assets/page-data/app-data.json` (50 bytes, a webpack hash, no rates) and `https://www.databricks.com/page-data/product/pricing/page-data.json` (404). The result is `data/generated/pricing-probe.json`, `foundPublicJson: false`. The [website terms of use](https://www.databricks.com/legal/terms-of-use) prohibit robots, scrapers, and any interface Databricks does not provide. The refresh does not download the bundle. AWS and GCP $/DBU stay on the cited table in section 3. Azure $/DBU now comes from Retail Prices, below.

### Azure DBU meters are regional list rates

East US Premium still matches section 3: Jobs Compute $0.30, All-purpose $0.55, SQL Analytics $0.22, SQL Pro $0.55, Serverless SQL $0.70, Automated Serverless $0.45, Interactive Serverless $0.95, DLT Core / Pro / Advanced $0.30 / $0.38 / $0.54, Model Training $0.65, Realtime Inferencing $0.07. When a region publishes that meter, the engine uses the meter and does not also multiply by the Lakehouse Real-Time region factor. A missing SKU still uses the curated US East rate times the factor.

A second fetch the same day, after a 429 retry, confirmed the thin regions are complete API pages (`NextPageLink` absent), not a truncated download:

| Region          | Meters stored | Not published there, so the engine falls back                                     |
| --------------- | ------------: | --------------------------------------------------------------------------------- |
| malaysiawest    |             8 | Classic jobs, all-purpose, SQL classic, DLT Core / Pro / Advanced                 |
| qatarcentral    |             7 | Serverless jobs, SQL, and DLT; interactive serverless; model serving and training |
| mexicocentral   |            13 | Model training                                                                    |
| switzerlandwest |            13 | Serverless SQL                                                                    |
| westcentralus   |            13 | Model serving                                                                     |

Some published meters are not the East US number. Switzerland West SQL Pro is $0.96 while Jobs Compute there is still $0.30. Malaysia West Serverless SQL is $0.77. The old region factor would have scaled every SKU by the same Lakehouse Real-Time ratio, which overstates classic jobs in Switzerland West (the factor is about 2.03, and the jobs meter is still $0.30). Enterprise on Azure still uses these Premium meters. `managed_services`, `lakeflow_connect`, and `ai_search` are not in the meter map.

### Virtual machines

Checked on 2026-10-16 against the public files:

| Cloud | Region    | Instance         | On-demand | Spot                          |
| ----- | --------- | ---------------- | --------: | ----------------------------- |
| AWS   | us-east-1 | m5.xlarge        |    $0.192 | $0.06144 (advisor, 68% saved) |
| AWS   | sa-east-1 | m5.xlarge        |    $0.306 | $0.04284                      |
| Azure | eastus    | Standard_DS3_v2  |    $0.293 | $0.068181                     |
| Azure | eastus    | Standard_DS13_v2 |    $0.741 | $0.172431                     |

The AWS offer file has all nine curated types in 15 of 16 catalog regions. `g4dn.xlarge` is absent from `ap-southeast-3`; that one line falls back to the reference-region rate and is marked approximate. Every curated Azure VM is present in all 39 catalog regions. GCP rows are still the previous seeds. The parser is covered by a fixture (cores × core SKU + memory × RAM SKU). It has not been run against the live catalog, because no API key is configured.

The default forecast is AWS Premium in us-east-1. Those reference rates did not move, so the medium preset is still about $170,258 a year, first month $11,997, cloud machines about 29%, band ±20%.

### Instance DBU ratings

`Standard_DS13_v2` is 2.0 DBU/hour on the Azure Jobs Compute instance table and in the Jobs FAQ. The golden test multiplies that 2.0 by the East US jobs meter $0.30 and by the Retail Prices VM rate $0.741. The FAQ’s older VM figure of $0.598 is not the current meter. The refresh does not download a third-party rating file and does not rewrite `data/instances.json`. LakeMeter-OSS is under the Databricks License and may be used only with the Databricks Services, so it is not a source for this public calculator.

### A browser cannot call the workspace

The SQL Statement API is `POST /api/2.0/sql/statements`. Databricks documents that the service does not send `Access-Control-Allow-Origin`, so a page on another origin cannot call it ([CORS policy error](https://kb.databricks.com/security/cors-policy-error-when-trying-to-run-databricks-api-from-a-browser-based-application)). A personal access token in browser JavaScript would also be visible to anyone who can read the page. GitHub Pages therefore does not connect to a workspace.

The local path is the same engine, outside the browser:

- `npm run cayfore` prints the default year.
- `npm run cayfore -- usage path/to.csv` fits a file.
- `npm run cayfore -- sql` prints `docs/usage-export.sql`.
- The MCP tool `forecast_usage` takes that CSV. `npm run test:mcp` lists the tools and checks the classic-jobs fixture ($53.82 DBU, $99.84 cloud) plus a short CSV.

### Forecast fit

`fitUsageForecast` runs in the browser. No extra library.

| History                         | Method                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| 24 months or more               | Additive Holt-Winters, season 12. Smoothing is a small grid.  |
| 14 to 23 months                 | Log-linear trend plus month effects. January is the baseline. |
| 6 to 13 months                  | Log-linear trend only.                                        |
| Fewer months, but 28 daily rows | Log-linear trend plus day of week, then summed into months.   |
| Shorter than that               | No fit. The existing run rate and the growth control stay.    |

The interval is an approximate normal band on the log scale: 1.96 residual standard errors, widened by `sqrt(1 + (t+1)/n)`. It is not a full covariance interval. The year band is the sum of the monthly lows and highs, which is wider than a simultaneous interval for the year.

The last month in the file is the level. Earlier months are not added into the basket. The fitted ratios scale that priced month, including the inferred VM line. Moving the growth control, or changing cloud, tier, or region, drops the fit so the control is the path again.

`apps/web/public/sample-usage-history.csv` is 18 months, two SKUs, generated as quantity × 1.02^t × a fixed month factor, with list prices $0.15 and $0.70. Holding out the last three months, the log-linear seasonal fit has MAPE 0.017% (`0.00017`). That checks the fitter against data of its own shape. It is not a backtest of a customer invoice. A one-month file, including the “Load a sample” button’s `sample-usage.csv`, still uses the run rate. A flat eight-month series stays within 10% of a ratio of one. Holt-Winters is selected once 24 months exist.

### Still estimated

| Piece                                  | Why it is still an estimate                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| AWS and GCP $/DBU                      | No allowed public rate feed. The section 3 table is cited and unchanged.            |
| Region factors on SKUs without a meter | Lakehouse Real-Time ratios, labeled proxy, including every AWS and GCP DBU line.    |
| GCP VM hourly rates                    | Seeds. The catalog call is optional and was skipped.                                |
| SQL classic VM dollars                 | The $0.22 per DBU-hour equivalence, not a VM meter.                                 |
| Spot when the discount is not 60%      | The slider. The advisor rate is used only at the default.                           |
| Uncalibrated band                      | ±20%, or a high side of 28% when a VM line is a stand-in.                           |
| Promotions                             | Off, including Lakehouse Real-Time through 2027-01-31.                              |
| Lakebase dollars on AWS                | The Flexera figure. Azure Lakebase stays the Database Serverless meter times 0.213. |
| Photon speedup                         | 2.9× DBU emission. Hours fall only in the explicit scenario.                        |
| Usage-file VM line                     | `system.billing.usage` has DBUs, not the cloud invoice.                             |
| Prediction interval                    | Approximate. The published MAPE is on synthetic data of the model’s own shape.      |

## 17. Review of the numbers on 2026-10-16

Recomputed from the engine after the price files and the fit were wired in. The default page is still AWS Premium, US East, medium preset, 3% monthly growth.

| Check                             | Result                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium year                       | $170,257.52. The page rounds that to about $170,258. First month $11,996.70, month 12 $16,606.23, cloud share 29%, band ±20%.                            |
| Small team at 3%                  | Corrected on 2026-10-17: year $28,378.81, first month $1,999.63.                                                                                         |
| Same medium basket, growth 0      | Year $143,960.40, twelve times the first month.                                                                                                          |
| Azure East US, same medium basket | First month $16,062.69, year $227,962.20, cloud share 33%. East US jobs meter is still $0.30, so this move versus AWS is the rate card, not a bad meter. |
| AWS classic job, m5.xlarge, 8×5   | DBU $53.82 and cloud $99.84. That is 3 × 0.69 DBU/h × hours × $0.15, and 3 × $0.192/h × hours, with hours = 8 × 5 × 52/12. One driver and two workers.   |
| Azure DS13 v2, one node, Jobs     | 2.0 DBU/h × $0.30, VM $0.741. The DBU count matches the Azure Jobs table and FAQ. The dollar rates match Retail Prices.                                  |
| us-east-1 m5.xlarge               | $0.192 on demand, spot advisor $0.06144.                                                                                                                 |
| sa-east-1 m5.xlarge               | $0.306 on demand. The reference-region stand-in is gone for this SKU, so the band is no longer widened only because the region is São Paulo.             |
| Switzerland West                  | Jobs Compute meter $0.30. SQL Pro meter $0.96. The engine uses those meters and does not also multiply by the 2.03 region factor.                        |
| 18-month sample                   | Log-linear seasonal fit. Holdout MAPE 0.017%. The page says “under 0.1%” so a tiny error does not print as 0%.                                           |
| Prices line                       | Prices updated 2026-10-16.                                                                                                                               |

A fitted file no longer also claims that every month steps by one flat percent. That sentence is only for a plan that is still on the growth control. Moving the control drops the fit.

What this review did not change: the curated AWS and GCP $/DBU table, the Photon multiplier, the SQL $0.22 machine equivalence, promotions, and the GCP VM seeds. Those are still estimates, listed in section 16.

## 18. Second pass on 2026-10-16: the $0 rows, the proxy, and confidence

This pass searched the per-cloud docs, the product pricing subpages, the serverless network cost page, the data-transfer pricing page, the Lakeflow Connect pricing page, the GA Zerobus post, Microsoft Learn, the Flexera 2026 guide, SunnyData’s 2026-08-04 re-check, the 2024 data-transfer PDF, and the public GCP billing catalog. `sku-rates.json` is still `2026-10-16.1`. The medium preset is unchanged.

### Confidence

| Band        |  Score | Meaning                                                                                                            |
| ----------- | -----: | ------------------------------------------------------------------------------------------------------------------ |
| measured    | 90–100 | Azure Retail Prices meter for that cell, or a first-party meter copied into the row. Stored product score: 92.     |
| cited       |  70–89 | A first-party number in the docs. Stored product score: 78.                                                        |
| secondary   |  40–69 | Two public compilations, or one compilation cross-checked. Reference-region SKU cells score 60. Product score: 55. |
| proxy       |  20–39 | A real rate for another SKU or region, scaled. Lakehouse Real-Time factors are this band. Cell score: 35.          |
| unpublished |   0–19 | No dollar rate is stored. The zero is not a guess. Product score: 8.                                               |

Products: 17 measured, 36 cited, 5 secondary, 12 unpublished.

SKU cells (`data/generated/rate-confidence.json`, 17 SKUs × 61 regions × 2 tiers = 2,074): **1,060 measured, 74 secondary, 940 proxy**. The measured cells are Azure meters on both tiers (Enterprise uses the Premium meter). The 74 secondary cells are the AWS and GCP reference regions, plus the three Azure East US SKUs that still have no meter (`managed_services`, `lakeflow_connect`, `ai_search`). Everything else is the proxy. No public AWS or GCP price file replaced it. The GCP Cloud Billing catalog does not list Databricks SKUs without a billing account. OWOX (October 2026) matches the curated US East table already in section 3, so those dollars did not move.

### Zerobus, the one rate that changed

| Source                            | What it says                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Flexera 2026, AWS table           | Premium $0.050/GB. Enterprise $0.064/GB.                                                                               |
| Flexera 2026, Azure table         | Premium $0.064/GB. This is the Azure table, not a second AWS Premium figure.                                           |
| SunnyData, re-verified 2026-08-04 | AWS Enterprise us-east $0.064/GB, “includes underlying compute.” A measured $0.069/GiB is the benchmark, not the list. |
| AWS Zerobus overview              | Billed against Jobs Serverless. The dollar rate is on the Lakeflow Connect page.                                       |
| Azure Learn                       | Billed against Automated Serverless. Same pointer.                                                                     |
| GA blog                           | “Volume-based” under Jobs Serverless, plus a 6-month promotion with no end date in the post.                           |
| Lakeflow Connect pricing page     | No dollar rate in a static fetch.                                                                                      |
| Flexera, GCP                      | Coming soon.                                                                                                           |

The calculator uses the $/GB card and does not also multiply gigabytes by the Jobs Serverless DBU rate. That would double-count if the $/GB already includes compute, which SunnyData says it does. The undated promotion is not applied. The rate is not scaled by a region factor. The default row is an example of 100 GB: AWS Premium $5.00, AWS Enterprise $6.40, Azure $6.40, GCP $0 with the existing “no list rate” note.

### Rows that stayed at $0

| Row                                       | Why it stayed                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private Link                              | The data-transfer page says per GB and per hour are billed. AWS and GCP are per hour and per GB. Azure per-GB charges are waived indefinitely. The AWS cost-management doc still says the hourly charge is “expected in the future.” No page prints a dollar amount. SAP capacity units from a 2025 PDF are not Databricks dollars. |
| Delta Sharing                             | Same-region egress is not charged. A first-party PDF effective 2024-08-01 lists AWS US East cross-region at $0.02/GB and internet at $0.09/GB. The 2026 docs still do not print that rate, so the PDF is not applied.                                                                                                               |
| NAT gateway                               | Docs point at the cloud’s own NAT price. That is the customer’s cloud bill, not a Databricks SKU.                                                                                                                                                                                                                                   |
| Databricks One, Marketplace, Free edition | No separate SKU. Spend is on the products opened inside them, or the edition is not a rate.                                                                                                                                                                                                                                         |
| Standard tier                             | Retired. East US Standard meters exist and are not a template.                                                                                                                                                                                                                                                                      |
| Compliance add-on                         | The portfolio already applies 10% or 30%. A second line would double-count.                                                                                                                                                                                                                                                         |
| Lakehouse Real-Time                       | The page is the region-factor source, not a second line.                                                                                                                                                                                                                                                                            |
| Other foundation models, external models  | No stored DBU-per-million. The user types a rate. The default stays $0.                                                                                                                                                                                                                                                             |

### Discrepancies

1. Zerobus: secondary sources print $/GB. First-party docs name a DBU SKU and do not print the dollar rate. The GA post’s “volume-based” wording agrees with $/GB. The calculator follows the cross-checked $/GB and records the SKU name as the billing origin, not as a second price.
2. Flexera’s Azure Zerobus row is $0.064, not a conflict with the AWS Premium $0.050 row. They are different tables.
3. Private Link hourly: the marketing page says billed. The AWS cost-management doc says expected in the future. No dollar figure on either, so the row stays $0.
4. The 2024 data-transfer PDF and the 2026 network docs disagree by omission. The older cross-region $0.02/GB is not applied.
5. AWS and GCP $/DBU remain a cited secondary card. Azure meters replace that card where the region publishes one. The proxy is smaller than it was before the meter pass, and it is now scored per cell instead of described only in prose.

## 19. Implementation corrections on 2026-10-17

`projectPortfolio` now supplies the dated points, planning range, annual total, explanations, and exports for web, CLI, and MCP. The UI no longer exports a different growth path from its fitted chart. Independent savings alternatives are labelled as overlapping, and each applied action matches its quoted reduction.

Observed usage now uses typed records and a review step. Complete calendar months are the default; partial months require explicit selection. USD, cloud, units, signed corrections, price coverage, and source basis are preserved. Effective-list prices resolve public promotions; they are distinct from negotiated or amortized effective costs. Priced amounts are not replaced by a synthetic basket or an invented VM bill. Unpriced DBUs use the correct catalog SKU, while unsupported quantities remain unresolved. See [USAGE-IMPORT.md](USAGE-IMPORT.md).

Products receive explicit forecast dates. Genie promotional math is reevaluated for each month, and saved plans keep inputs rather than treating generated DBUs as permanent prices. Source-labelled custom/imported amounts remain separate from catalog-owned rates. Net effective/billed import amounts are not discounted or charged a platform add-on again. Source-confidence scores describe evidence quality and are not statistical probabilities.

The UI exposes an annual budget, named scenarios, a dated usage timeline, cumulative budget comparison, and separate historical and forecast chart series. JSON, CSV, PDF, saved links, and the month table reconcile to the same canonical result. Internal navigation preserves the plan fragment. Invalid saved JSON leaves the active plan unchanged.

Calendar gaps and zero periods retain their meaning when fitting history. Holdout tuning uses training observations only. The model-only interval and source/infrastructure planning range are separate; no customer forecast-accuracy claim follows from synthetic examples. Customer bill reconciliation, representative backtests, and participant research still require appropriate inputs and people.

## 20. Price refresh on 2026-10-17

`node scripts/refresh-prices.mjs` re-read Azure Retail Prices for all 39 regions on the rate card and the AWS EC2 offer files for all 16 regions. `GCP_BILLING_API_KEY` is not set, so GCP virtual-machine prices stayed seeds. The two Databricks price-JSON probes still returned no rates (`data/generated/pricing-probe.json`, `foundPublicJson: false`).

| File                                | Before             | After              | Dollar rates                                              |
| ----------------------------------- | ------------------ | ------------------ | --------------------------------------------------------- |
| `data/product-catalog.json`         | `2026-10-16.5`     | `2026-10-17.1`     | No product added or removed. 70 rows.                     |
| `data/sku-rates.json`               | `2026-10-16.1`     | `2026-10-17.1`     | $/DBU table unchanged. The version is the re-check date.  |
| `data/instances.json`               | `2026-10-15.1`     | `2026-10-17.1`     | DBU counts unchanged. The refresh does not download them. |
| `data/cloud-vm-prices.json`         | `2026-10-16.2`     | `2026-10-17.2`     | 383 rows. On-demand and spot hourly changes: 0.           |
| `data/azure-dbu-meters.json`        | `2026-10-16.2`     | `2026-10-17.2`     | 530 rows. `$/DBU` changes: 0.                             |
| `data/generated/pricing-probe.json` | checked 2026-10-16 | checked 2026-10-17 | Still no public rate JSON.                                |

East US meters that the catalog cites outside the mapped SKU table were read again from the Retail Prices API and did not move: Jobs Light Premium $0.22 and Standard $0.07, Standard jobs $0.15, Standard all-purpose $0.40, Standard SQL $0.22, Data Processed $0.02/GB, launch charge $0.07, managed storage $0.026 per DSU, Clean Rooms $50 per collaborator-day, compliance $0.10 and mission critical $0.15 per DBU, and Premium Database Serverless $0.26 per DBU-hour. No East US meter name contained “performance”.

The prices line is now `Prices updated 2026-10-17.` The default medium AWS Premium US East year is still **$170,257.52**. First month $11,996.70, month 12 $16,606.23, cloud share 29%, band ±20%.

### Transactions are Generally Available

The Databricks feed item from 2026-10-16, [Transactions are Generally Available, advancing warehousing on the Lakehouse](https://www.databricks.com/blog/transactions-are-generally-available-advancing-warehousing-lakehouse), announces multi-statement transactions on Delta Lake and Apache Iceberg, with stored procedures, temporary tables, and SQL scripting. The article body does not name a DBU, a SKU, or a price. The only “DBU” and “pricing” text on the page is site navigation. This is existing SQL warehouse billing, not a new product. The same day’s [Closing the Binary Blind Spot](https://www.databricks.com/blog/closing-binary-blind-spot-domain-knowledge-injection-llm-malware-triage-npm-packages) post is research about malware triage, not a SKU. Older feed items (Stripe to Lakebase, Predictive AI Functions, Document Intelligence, geospatial queries) are from 2026-10-14 and 2026-10-15 and do not add a list rate.

### Promotions

Genie One and Genie Agents user LLM usage remains free through 2027-01-31 (`GENIE_FREE_USAGE`). Genie Code remains at the 0.75 factor through 2027-01-31. Zerobus’s launch promotion is still undated in the GA post and is still not applied. AI Parse Document’s 50% promotion ended 2026-06-30 and was already absent from the default midpoint rate. Serverless real-time inference promotional pricing through 2027-01-31 and the Mission Critical 50% add-on through 2027-06-30 stay off the default rates.
