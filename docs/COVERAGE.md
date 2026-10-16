# Catalog coverage

Generated from `data/product-catalog.json`, `data/sku-rates.json`, and `data/azure-dbu-meters.json`. Estimates only. Cayfore is not affiliated with Databricks.

Catalog coverage: 59 of 70 products (84.3%) have a stored rate or a priced underlying SKU. Azure meters fill 97.1% of region-and-SKU cells across 39 regions. AWS (16 regions) and GCP (6 regions) use the US East card times a Lakehouse Real-Time region factor, not a per-region meter.

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

AWS: 16 of 16 regions have a Lakehouse Real-Time factor (Premium $/DBU ÷ $0.55). None of those regions has a public per-SKU meter. The US East $/DBU table is the curated secondary card in [RESEARCH.md](RESEARCH.md), cross-checked across Flexera 2026, LakeSentry, and OWOX. Databricks does not publish a price JSON, and the website terms disallow scraping the pricing client. Marketplace private listings are not a public rate card.

GCP: 6 of 6 regions have a factor. Factors outside the reference region are labeled proxies. No first-party GCP regional DBU table was found. GCP virtual-machine prices stay seeds unless `GCP_BILLING_API_KEY` is set for the price refresh.

The default AWS US East forecast is unchanged by this report. Region factors are not a new rate.
