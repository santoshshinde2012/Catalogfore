# Databricks cost model research

Last verified: **2026-10-16**. The 2026-10-15 tables below are unchanged unless section 15 says a figure moved.

This note is the source of truth for the calculator’s pricing assumptions. Dollar rates below are **list prices for estimation**, not a quote. Databricks and the clouds change rates, promotions, and region availability without notice. Where an official page renders prices only in the browser (the public Databricks price lists and the Azure Databricks price tables returned `$-` to a static fetch on this date), the dollar figure is taken from a secondary compilation and marked as such. The app must show an “estimates only” disclaimer on every total.

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

**Promotions called out on the Azure page (2026-10-15), not baked into the default rates:** serverless real-time inference promotional pricing through 2027-01-31; Genie 150 free DBUs/month and a 25% promo through 2027-01-31; Mission Critical add-on 50% promo until 2027-06-30. AI Parse Document on Microsoft Learn notes a 50% promo through 2026-06-30. The engine should keep a `promotions[]` list separate from list rates so a refresh can expire them.

## 4. Instance DBU ratings

DBU **count** per node-hour is a property of the instance, not of the dollar rate. Dollar rate is chosen by SKU (Jobs vs All-Purpose vs pipeline edition). The same `m5.xlarge` emits the same DBUs/hour on Jobs and All-Purpose; All-Purpose just costs more per DBU.

The public instance picker ([databricks.com/product/instance-types](https://www.databricks.com/product/instance-types)) did not return numbers to a static fetch. Representative non-Photon rates below are from the Databricks Labs LakeMeter open data ([`instance-dbu-rates.csv`](https://github.com/databrickslabs/lakemeter-oss/blob/ab0dfcbf/backend/static/pricing/instance-dbu-rates.csv)), which that project attributes to Databricks pricing bundles. Azure `Standard_DS3_v2` = 0.75 DBU and `DS4_v2` = 1.50 DBU also match the instance table structure on the Azure pricing page.

| Cloud | Instance        | vCPU | Memory (GiB) | DBU / hour |
| ----- | --------------- | ---: | -----------: | ---------: |
| AWS   | m5.xlarge       |    4 |           16 |       0.69 |
| AWS   | m5.2xlarge      |    8 |           32 |       1.37 |
| AWS   | m5d.large       |    2 |            8 |       0.34 |
| AWS   | i3.xlarge       |    4 |         30.5 |       1.00 |
| AWS   | r5d.xlarge      |    4 |           32 |       0.90 |
| Azure | Standard_DS3_v2 |    4 |           14 |       0.75 |
| Azure | Standard_DS4_v2 |    8 |           28 |       1.50 |
| GCP   | n1-standard-4   |    4 |           15 |       0.71 |
| GCP   | n2-standard-4   |    4 |           16 |       0.72 |
| GCP   | n2d-standard-8  |    8 |           32 |       1.44 |

Worked Azure example printed on the pricing page (numbers did render in the FAQ, unlike the rate tables): 10 × DS13v2 for 1h10m at 2.0 DBU/node and **$0.30/DBU** Jobs = $7 DBU, plus 2.5h × 10 × $0.598 VM = $14.95, total $21.95. That $0.30 Jobs rate matches the Azure column above. Source: [Azure Databricks pricing](https://azure.microsoft.com/en-us/pricing/details/databricks/). On 2026-10-16 the Retail Prices API listed Linux East US DS13 v2 at **$0.741/hour**, so the catalog follows the API and treats $0.598 as a stale FAQ example.

The catalog shipped with this repo should carry a **curated** instance set (general, compute, memory, storage, GPU) per cloud, with `source` and `verified` fields, not a dump of every SKU. VM $/hour is filled from the public cloud APIs (section 10) and may be refreshed independently of DBU/hour.

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
- LakeMeter’s community multiplier file is **not uniform**: it records 2.9× for AWS jobs and pipelines, 2.5× for Azure/GCP jobs and pipelines, and 2.0× for all-purpose on AWS and Azure ([`dbu-multipliers.csv`](https://github.com/databrickslabs/lakemeter-oss/blob/ab0dfcbf/backend/static/pricing/dbu-multipliers.csv)). That file is a useful cross-check, not a contract.

**Calculator rule:** classic Photon defaults to **2.9×** DBU/hour (the only multiplier printed on a first-party pricing page), applied only when Photon is toggled on and the SKU is classic. Serverless and SQL do not get a second multiplier. The multiplier is data, not a constant buried in UI code, so it can be corrected without a logic change. Tips should say Photon often still wins on total cost because jobs finish faster; the user can shorten `hours` in a comparison scenario. We will not invent a speedup factor.

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

| Source                        | Endpoint                                                                                                                                                                                                                                                                                                    | Auth                                     | Use in this repo                                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AWS Price List **bulk files** | `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json` and `.../AmazonEC2/current/<region>/index.json` (also CSV). Docs: [fetching price list files](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-the-aws-price-list-bulk-api-fetching-price-list-files-manually.html). | None for the offer files                 | Refresh EC2 Linux on-demand $/hour for the curated instance list. Files are large; filter to the instance IDs we ship.                                                                                                                                                         |
| AWS Price List **Query API**  | `https://api.pricing.us-east-1.amazonaws.com` (also eu-central-1, ap-south-1)                                                                                                                                                                                                                               | AWS credentials                          | Skip in GitHub Actions. No long-lived keys in this public repo.                                                                                                                                                                                                                |
| Azure Retail Prices           | `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview` with OData `$filter`                                                                                                                                                                                                            | None                                     | Best unauthenticated API. Refresh VM retail, spot, and 1-year/3-year reservation meters. Filter `serviceName eq 'Virtual Machines'` and `armRegionName`. Azure Databricks meters are also in this API; a future refresh may harvest DBU rates when the meter names are stable. |
| GCP Cloud Billing Catalog     | `https://cloudbilling.googleapis.com/v1/services/<id>/skus?key=API_KEY`                                                                                                                                                                                                                                     | API key                                  | Do not require a key for the default Action. Ship pinned GCE on-demand rates and refresh only when `GCP_BILLING_API_KEY` is set as an Actions secret.                                                                                                                          |
| GCP Pricing API v2            | account-specific SKU prices                                                                                                                                                                                                                                                                                 | Billing account credentials              | Out of scope. Contract prices are not public.                                                                                                                                                                                                                                  |
| Databricks public price API   | None found                                                                                                                                                                                                                                                                                                  | —                                        | Product pages are JS apps. No documented unauthenticated price endpoint as of 2026-10-15.                                                                                                                                                                                      |
| `system.billing.list_prices`  | In-workspace table                                                                                                                                                                                                                                                                                          | Account admin / system-table entitlement | Historical SKU list and promotional price. Not callable from GitHub Actions.                                                                                                                                                                                                   |
| `system.billing.usage`        | In-workspace table                                                                                                                                                                                                                                                                                          | Same                                     | 365-day billable usage. The app imports a **CSV export** of this table; it does not connect to a workspace.                                                                                                                                                                    |

`list_prices.pricing` is a struct: `default` (published list), `promotional`, and `effective_list` (what to multiply by `usage_quantity`). Join on `sku_name` and `usage_end_time` inside `[price_start_time, price_end_time)`. Usage columns the importer should accept, from the [billing table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing) (updated 2026-10-08): `sku_name`, `cloud`, `usage_date`, `usage_quantity`, `usage_unit`, `billing_origin_product`, `usage_metadata`, `record_type`. Sum `ORIGINAL` plus later corrections (`RETRACTION` is negative). Do not treat the CSV as a price list; join it to the bundled list rates only to **scale** a forecast (last full month becomes month 0). Cloud VM dollars are not in this table.

## 11. Hyperscaler calculators, and the gap

Compared on 2026-10-15 from [AWS calculator assumptions](https://aws.amazon.com/calculator/calculator-assumptions/), the [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/), [Google Cloud pricing calculator](https://cloud.google.com/products/calculator), and the secondary comparison [Tech Insider, 2026](https://tech-insider.org/au/aws-azure-gcp-pricing-calculator-2026/).

|                                   | AWS Pricing Calculator               | Azure Pricing Calculator                                                                                                          | GCP Pricing Calculator                | Databricks instance calculator | This project                             |
| --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------ | ---------------------------------------- |
| No login to estimate              | Yes                                  | Yes                                                                                                                               | Yes (saving wants a Google account)   | Yes                            | Yes                                      |
| Share link                        | Yes                                  | Yes                                                                                                                               | Yes                                   | No portfolio link              | URL state                                |
| Export                            | CSV                                  | Excel                                                                                                                             | PDF / email                           | No                             | CSV, JSON, PDF                           |
| Databricks DBU + VM together      | No Databricks model                  | Azure Databricks service exists; rates often blank until the page’s own scripts run; still a single configuration, not a forecast | No DBU model (DBUs are not a GCP SKU) | DBU only                       | Both                                     |
| Commitments                       | RI and Savings Plans, off by default | Reservations, savings plans                                                                                                       | CUD, sustained use                    | “Contact us”                   | Apply a commit and see the dollar change |
| Growth, seasonality, 12–36 months | No                                   | No                                                                                                                                | No                                    | No                             | Yes                                      |
| Actuals in, forecast out          | No                                   | No                                                                                                                                | No                                    | No                             | `system.billing.usage` CSV               |
| Public rate refresh               | Bulk files, no key                   | Retail Prices API, no key                                                                                                         | Catalog needs a key                   | None                           | Scheduled Action                         |

They are good at SKU coverage inside one cloud and at producing a number a procurement reviewer recognizes. They are weak at the thing a Databricks owner actually decides: classic versus serverless, Photon on or off, jobs versus all-purpose, spot mix, and whether a commit still pays off if the platform grows 8% a quarter and SQL drops every January. AWS’s own assumptions page says the calculator is not a quote, ignores free tier and most credits, and mishandles tiered prices when you already have usage. We should copy that honesty, not the false precision.

## 12. MCP

Databricks ships **managed MCP servers** for workspace data: Genie, Genie One, Databricks SQL, AI Search, and Unity Catalog functions ([managed MCP](https://docs.databricks.com/aws/en/agents/mcp-tools/managed-mcp), [MCP overview](https://docs.databricks.com/aws/en/agents/mcp-tools/) updated 2026-10-08). They require a workspace URL and OAuth or a personal access token. They query customer data. They do not expose list prices or a forecast.

A custom MCP can be hosted on Databricks Apps ([custom MCP](https://docs.databricks.com/aws/en/agents/mcp-tools/custom-mcp)), which is the wrong place for a public pricing tool: it would bill the workspace and demand a login.

**Decision:** ship a small **stdio MCP server in this repo** (`/mcp`) that calls the same TypeScript pricing engine as the website. Tools: `list_skus`, `estimate_workload`, `forecast`, `compare_scenarios`. No Databricks credentials, no customer data. Assistants that need live account usage should use Databricks SQL MCP against `system.billing.usage` and then pass the totals into this server. Building that bridge into their account is out of scope.

## 13. Rate sources (what the catalog stores, and who published it)

Every number in `data/sku-rates.json` and `data/instances.json` is one of these classes. “Official” means a first-party page returned the figure as text on 2026-10-15. “Secondary” means the official price page is a client-rendered app that returned no dollars to a static fetch, and the figure is taken from a 2026 compilation that cites those pages. Secondary dollars are estimates until a `system.billing.list_prices` export or a Retail Prices harvest replaces them.

| Catalog field                                                | Value basis                                                                                           | Source class                                                                                          | Source                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL DBU/hour ladder, 2X-Small through 4X-Large               | 4, 6, 12, 24, 40, 80, 144, 272, 528                                                                   | Official                                                                                              | [Microsoft Learn, serverless DBU consumption](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing)                                                                                                                                                                                      |
| Photon multiplier default                                    | 2.9× classic DBU emission                                                                             | Official                                                                                              | [Azure Databricks pricing](https://azure.microsoft.com/en-us/pricing/details/databricks/), Lakeflow pipeline feature table                                                                                                                                                                               |
| Jobs example, Azure                                          | DS13 v2 = 2.0 DBU, Jobs = $0.30/DBU, VM $0.598                                                        | Official (FAQ arithmetic rendered)                                                                    | Same Azure pricing page                                                                                                                                                                                                                                                                                  |
| DBCU ceiling                                                 | Up to 37% versus pay-as-you-go, 1- and 3-year tiers                                                   | Official (percents per tier did not render)                                                           | Same Azure pricing page, pre-purchase section                                                                                                                                                                                                                                                            |
| Add-ons                                                      | Compliance +10% of product spend; mission critical +30%                                               | Official                                                                                              | Same Azure pricing page                                                                                                                                                                                                                                                                                  |
| CPU serving                                                  | 1 concurrent request-hour = 1 DBU                                                                     | Official                                                                                              | Microsoft Learn, Model Serving SKU                                                                                                                                                                                                                                                                       |
| GPU serving DBU/hour                                         | T4 10.48, A10G 20, L40S 44.86, A100 80GB 78.60, H100 100, plus the multi-GPU rows on the product page | Official                                                                                              | [Model serving pricing](https://www.databricks.com/product/pricing/model-serving) and Microsoft Learn                                                                                                                                                                                                    |
| Foundation model DBU per million tokens                      | Llama 4 Maverick 7.143 / 21.429, and the other rows in section 9                                      | Official quantities                                                                                   | Microsoft Learn. Dollars = those DBUs × the $0.07 serving rate, which matches the $0.50 / $1.50 secondary quote                                                                                                                                                                                          |
| AI Search DBU/hour                                           | Standard 4.00, storage-optimized 18.29                                                                | Official                                                                                              | Microsoft Learn and [AI Search pricing](https://www.databricks.com/product/pricing/ai-search)                                                                                                                                                                                                            |
| AI Search US East $/hour                                     | $0.28 and $1.28 per unit-hour                                                                         | Official (worked example on the product page)                                                         | AI Search pricing page                                                                                                                                                                                                                                                                                   |
| Apps multipliers                                             | Medium 0.5×, Large 1× of interactive serverless                                                       | Official                                                                                              | Microsoft Learn, Interactive Serverless SKU                                                                                                                                                                                                                                                              |
| Lakebase multiplier                                          | 0.213× database serverless; storage 15× DSU                                                           | Official multiplier, not a dollar rate                                                                | Microsoft Learn                                                                                                                                                                                                                                                                                          |
| Model training $/DBU                                         | $0.65 US East, from the fine-tuning cost column (225 DBU ≈ $146.25)                                   | Official                                                                                              | [Microsoft Learn, serverless DBU consumption](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing)                                                                                                                                                                                      |
| AWS region factors                                           | Premium Lakehouse Real-Time $/DBU ÷ $0.55, all 16 published regions                                   | Official ratio, applied as a proxy to other SKUs                                                      | [Lakehouse Real-Time pricing](https://docs.databricks.com/aws/en/compute/sql-warehouse/real-time-pricing), updated 2026-10-08                                                                                                                                                                            |
| Azure region factors                                         | Lakehouse Real-Time Premium $/DBU ÷ $0.70, all 39 regions, effective 2026-10-10                       | Official ratio, applied as a proxy to other SKUs                                                      | [Azure Lakehouse Real-Time pricing](https://learn.microsoft.com/en-us/azure/databricks/compute/sql-warehouse/real-time-pricing)                                                                                                                                                                          |
| Instance DBU/hour                                            | Curated non-Photon counts (m5.xlarge 0.69, DS3 v2 0.75, n2-standard-4 0.72, …)                        | Community extract of Databricks pricing bundles; DS3 v2 / DS4 v2 also match the Azure table structure | [LakeMeter instance-dbu-rates.csv](https://github.com/databrickslabs/lakemeter-oss/blob/ab0dfcbf/backend/static/pricing/instance-dbu-rates.csv), [Azure pricing instance table](https://azure.microsoft.com/en-us/pricing/details/databricks/)                                                           |
| $/DBU by SKU, cloud, and tier                                | Section 3 table                                                                                       | Secondary, cross-checked where two guides agree                                                       | [Flexera 2026 guide](https://www.flexera.com/blog/finops/databricks-pricing-guide/), [LakeSentry](https://lakesentry.io/blog/databricks-pricing-explained/), [OWOX](https://www.owox.com/blog/articles/databricks-pricing)                                                                               |
| DSU $/unit, Lakebase $/CU-hour, object storage, egress seeds | Section 3 and section 9                                                                               | Secondary or labeled assumption                                                                       | Flexera for DSU and Lakebase dollars. Egress and object storage are editable assumptions, not a tariff                                                                                                                                                                                                   |
| VM $/hour seeds                                              | Reference-region on-demand                                                                            | Mixed                                                                                                 | AWS rows match the published us-east-1 Linux list (m5.xlarge $0.192, i3.xlarge $0.312, g4dn.xlarge $0.526). Azure eastus rows were replaced from the Retail Prices API on 2026-10-16 (DS3 v2 $0.293, DS4 v2 $0.585, DS13 v2 $0.741, D4s v5 $0.192, E8s v3 $0.504, F4s v2 $0.169). GCP rows remain seeds. |
| GCP region factors other than the reference region           | Short proxy list                                                                                      | Not a published tariff                                                                                | Labeled `proxy` in the catalog. No first-party GCP regional DBU table was found on 2026-10-15                                                                                                                                                                                                            |

No public unauthenticated price endpoint was found on databricks.com. Azure Databricks DBU meters are in the Retail Prices API (section 15). The AWS and GCP APIs in section 10 can refresh VM rates. None of these APIs return a negotiated discount.

## 14. Implications for the catalog

- Version the JSON (`version`, `verifiedOn`, `source` per rate family).
- US East list rates are curated and reviewed by a human. VM $/hour may be machine-refreshed.
- Never present a total without the disclaimer and the catalog version.
- Region factors and the Photon multiplier are explicit inputs with documented defaults.
- Promotions are dated. Expired promos must not apply.
- Secondary-source dollar rates stay in the catalog until a Retail Prices harvest or a `list_prices` export replaces them, and the UI says so.

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

AWS and GCP classic $/DBU pages still render in the browser. Those columns stay secondary (Flexera 2026, LakeSentry, OWOX) and were not edited. Foundation-model token DBUs and GPU DBU/hour counts stay on the Microsoft Learn and model-serving figures already in section 9. The Retail Prices API prices serving at $0.07/DBU; it does not publish a separate token meter. The AWS EC2 offer file was not re-downloaded in this pass. GCP VM rows stay seeds.

### Team presets

Dollar shares, not DBU shares. Pipelines are classic jobs on the cloud’s default instance (8 hours, 5 days), so they carry the VM line. Dashboards are a serverless SQL warehouse at size S, so they do not. Models are Llama 3.1 8B input tokens with output tokens at a quarter of the input, on the $0.07 serving rate, so they do not add a VM either. The basket is solved so list dollars match the typed monthly amount. A cloud or tier change keeps that basket and reprices it.

| Preset | Monthly list | Mix (pipelines / dashboards / models) | Why this amount                                                                                                                                                                                                                                    |
| ------ | -----------: | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small  |       $2,000 | 35% / 55% / 10%                       | Inside DoiT’s small-team range of $1,500–$3,000 a month including infrastructure, and inside the $1,800–$2,500 small-team range in the Cosmos 2026 breakdown. Dashboards are the larger share because that is the visible product of a small team. |
| Medium |      $12,000 | 45% / 40% / 15%                       | The top of DoiT’s “10 TB analytics team, $8,000–$12,000 including AWS infrastructure,” and inside their mid-size band of $5,000–$15,000. It is intentionally below the Cosmos multi-team platform range of $16,000–$22,000. Pipelines lead.        |
| Large  |      $25,000 | 40% / 30% / 30%                       | The starting monthly Databricks bill in the Similarweb engineering write-up (later cut to $12,500). A 30% model share is a real GenAI line at that bill, and it is still far under the $70,000–$90,000 enterprise estates in the Cosmos breakdown. |

Sources: [DoiT, Databricks pricing explained](https://www.doit.com/blog/databricks-pricing-explained-dbus-tiers-cost-control); [Cosmos, how much Databricks costs (2026)](https://cosmosthrace.com/resources/databricks/how-much-does-databricks-cost); [Similarweb Engineering, how we cut our Databricks costs by 50%](https://medium.com/similarweb-engineering/how-we-cut-our-databricks-costs-by-50-7c60d6b6c069).

These are sizing anchors, not a claim that the forecast reproduces anyone’s invoice. The year total is twelve months of list arithmetic on the three archetypes, plus growth, plus the uncertainty band. A usage CSV replaces the monthly amount and the mix and tightens the band, because the file supplied the quantity and the VM line is still inferred.
