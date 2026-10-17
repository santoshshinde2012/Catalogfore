# Catalog coverage

Generated from `data/product-catalog.json`, `data/sku-rates.json`, `data/azure-dbu-meters.json`, and `data/databricks-dbu-rates.json`. Estimates only. Cayfore is not affiliated with Databricks.

Catalog coverage: 59 of 70 products (84.3%) have a stored rate or a priced underlying SKU. Azure meters fill 97.1% of mapped region-and-SKU cells across 39 regions. AWS and GCP use validated first-party regional prices where captured; remaining reference bases, consumption assumptions, and regional proxies stay labeled. Stored-price coverage does not establish service availability.

## By product

A product counts as covered when `listPrice` is `distinct` (its own rate) or `reused_sku` (a documented underlying SKU or conversion). `unpublished` is a real gap: nothing billable was published, or the only published signal is a meter whose unit is not a rate we can apply.

|                    | Priced | Products | Coverage |
| ------------------ | -----: | -------: | -------: |
| All                |     59 |       70 |    84.3% |
| data_engineering   |     15 |       17 |    88.2% |
| warehousing_bi     |      6 |        7 |    85.7% |
| ai_ml              |     25 |       27 |    92.6% |
| apps_oltp          |      5 |        5 |     100% |
| governance_sharing |      8 |       14 |    57.1% |

Unpublished product ids: compliance_addon, databricks_one, delta_sharing, external_models, fm_other, free_edition, lakehouse_realtime, marketplace, nat_gateway, private_link, standard_tier.

## By cloud and region

Azure Retail Prices meters fill 530 of 546 cells (97.1%). A cell is one of 14 mapped SKUs in one of 39 Azure regions on the rate card. A missing cell still uses the curated US East rate times the Lakehouse Real-Time region factor.

Regions that are not a full meter set:

| Region          | Mapped SKUs present |
| --------------- | ------------------: |
| malaysiawest    |               57.1% |
| mexicocentral   |               92.9% |
| qatarcentral    |                 50% |
| switzerlandwest |               92.9% |
| westcentralus   |               92.9% |

AWS: 512 of 544 cloud/region/edition/SKU cells have a validated exact regional first-party DBU price.

GCP: 181 of 204 cloud/region/edition/SKU cells have a validated exact regional first-party DBU price.

The resolver uses exact Azure meters or validated Databricks price-card and calculator data before reference fallbacks. A no-region source price is a reference base, and reuse outside its scope remains an estimate. Conflicting first-party prices are withheld pending review. GCP virtual-machine prices remain separate and stay seeds unless `GCP_BILLING_API_KEY` is set. See [source evidence and maintenance](UNIT-COSTS.md).
