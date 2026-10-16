# Price refresh

`scripts/refresh-prices.mjs` rebuilds the machine-owned price files. It does not edit `data/sku-rates.json`. That file stays a cited table.

## What it writes

| File                         | Contents                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `data/cloud-vm-prices.json`  | On-demand hourly VM rates for every region in the catalog. Spot hourly when a public source has one. |
| `data/azure-dbu-meters.json` | Premium Azure Databricks $/DBU by region and catalog SKU.                                            |
| `data/pricing-probe.json`    | Whether a public Databricks rate JSON was found. The probe does not scrape the pricing bundle.       |

`data/instances.json` is read for the instance list and for validation. The script does not rewrite it.

Each price file has `version` (`YYYY-MM-DD.N`) and `updatedOn`. The page prints “Prices updated” from the latest of the VM file, the Azure meter file, and `verifiedOn` on the curated rate card.

## Sources

**Azure Retail Prices.** `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview`. No key. For each Azure region in `data/sku-rates.json` the script asks for the six curated VM SKUs and for `serviceName eq 'Azure Databricks'`. Items often omit `priceType`; a missing type is treated as Consumption. Linux on-demand excludes Windows, Spot, and Low Priority. Spot is the Consumption meter whose name contains Spot. DBU meters are matched by the Premium meter name in `scripts/parse-prices.mjs`. Photon, trial, and POC meters are skipped. The script follows `NextPageLink`. A 429 is retried five times, waiting 400ms, 800ms, 1.6s, 3.2s, and 6.4s. Regions run three at a time.

If a region returns no meters, the previous rows for that region are kept. A new VM price more than five times the previous price, or less than a fifth of it, is rejected and the old row stays.

**AWS Price List bulk files.** `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/<region>/index.csv`. No key. One region file is about 300 MB. The script streams it, keeps Linux shared on-demand rows whose capacity status is Used and whose preinstalled software is NA, and aborts the download once every curated instance in that region has a price. Two regions run at a time. `SKIP_AWS=1` skips this step so an Azure retry does not re-download the offer files.

**Spot.** `https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json`. The `s` field is the percent saved versus on-demand, not an hourly price. The script stores `spotHourly = onDemand × (1 − s/100)` when the saving is between 0 and 95 percent. The engine uses that hourly rate only while the workload’s spot discount is still the catalog default (60%). Moving the discount uses the slider instead. A fallback VM price copied from another region does not carry `spotHourly`.

**GCP Cloud Billing Catalog.** `https://cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus`. Compute Engine. A machine hour is cores times the “{Family} Instance Core” SKU plus memory times the “{Family} Instance Ram” SKU, usage type OnDemand, region in `serviceRegions`. The script runs only when `GCP_BILLING_API_KEY` is set. Otherwise it logs `gcp: skipped` and leaves the seeded rows.

**Instance DBU ratings.** `data/instances.json` is a cited table. The refresh does not download or overwrite it.

Azure counts that the [Microsoft pricing page](https://azure.microsoft.com/en-us/pricing/details/databricks/) publishes for All-Purpose Compute, Jobs Compute, and Jobs Light Compute (Premium, non-Photon, fetched 2026-10-16) are `Standard_DS3_v2` 0.75, `Standard_DS4_v2` 1.50, `Standard_DS13_v2` 2.00, `Standard_D4s_v5` 1.00, and `Standard_E8s_v3` 2.00. The Jobs Compute FAQ on that page uses 2.0 DBU per DS13 v2 node. `Standard_F4s_v2` does not appear in those tables, so its 0.75 stays a manual figure.

AWS and GCP counts are a manual table. No allowed public feed publishes them. The [Databricks website terms of use](https://www.databricks.com/legal/terms-of-use) forbid scrapers and interfaces Databricks does not provide, so the refresh does not read the instance picker.

Databricks Labs LakeMeter-OSS is not a source. Its GitHub license is the Databricks License (Copyright 2026 Databricks, Inc.). That license allows the materials only in connection with use of the Databricks Services under the [Master Cloud Services Agreement](https://www.databricks.com/legal/mcsa). A public calculator is outside that grant, so this repo does not fetch or redistribute the pricing bundle.

**Databricks.com.** The script fetches two URLs the pricing app references: `/en-pricing-assets/page-data/app-data.json` and `/page-data/product/pricing/page-data.json`. It looks for rate fields. It does not download or parse the client bundle. The [website terms of use](https://www.databricks.com/legal/terms-of-use) forbid scrapers and other interfaces Databricks does not provide. No rate JSON means the curated $/DBU table stays.

## Validation

`scripts/validate-catalog.mjs` checks version shape, dates, region factors between 0.4 and 3, SKU rates between 0 and 5, instance DBU/hour between 0.05 and 40, unique keys, VM hourly rates between 0 and 50, and a spot rate that is positive and below on-demand. The refresh exits before writing if that check fails. `npm test` runs the same check on the files in the repo.

## GitHub Action

`.github/workflows/refresh-prices.yml` runs Mondays at 06:00 UTC, and on demand. It checks out the repo, runs the script with `GCP_BILLING_API_KEY` from the repository secret (empty when the secret is unset), runs the catalog test, and opens a pull request on `price-refresh` when one of the four files changed. Review the diff. The figures are list prices for an estimate, not a quote.

## Run it locally

```bash
npm run refresh-prices
SKIP_AWS=1 npm run refresh-prices
```

Do not commit a GCP key. Put it in the Actions secret if you want the weekly job to refresh GCE rates. `NOTICE` records which price files come from which public source.
