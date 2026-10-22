# Price refresh

Runtime pricing is a deterministic snapshot. Network retrieval lives in scripts; the browser, CLI, MCP server, Excel exporter and unit-cost inventory use the shared engine resolver. A source review date is separate from a numeric observation and a tariff effective date.

## Source files and precedence

| Input                                     | Role                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `data/azure-dbu-meters.json`              | Exact Premium Azure DBU meters by region; the engine's Azure Enterprise alias uses the same meters.                        |
| `data/databricks-dbu-rates.json`          | Validated first-party Databricks USD/DBU observations, exact locators, source metadata, exclusions and quarantined issues. |
| `data/sources/*.json.gz`                  | Exact original Databricks price-card/calculator responses, with SHA-256 fingerprints recorded in the normalized snapshot.  |
| `data/sku-rates.json`                     | Legacy reference bases, regional planning factors and explicit consumption/storage assumptions.                            |
| `data/cloud-vm-prices.json`               | Separate cloud infrastructure observations and seeded or advisor-derived estimates.                                        |
| `data/instances.json`                     | Curated instance consumption ratings; dollar-price refreshes do not overwrite them.                                        |
| `data/component-price-conflicts.json`     | Shared component exclusions applied by forecasting and the unit inventory.                                                 |
| `data/unit-cost-evidence.json`            | Reviewed source scopes, conditions and known gaps.                                                                         |
| `data/generated/unit-costs.{csv,json}.gz` | Derived inventory. Expanded ordinary files are generated locally and are not committed.                                    |
| `data/generated/`                         | Rebuilt reports: coverage, confidence, catalog-watch state, the pricing probe, and the unit-cost artifacts.                |

The injectable `resolveDbuRate` policy, supplied by `catalog.ts`, prefers a matching exact first-party regional observation. An unscoped or reference-region base can support a labeled planning fallback. Missing evidence never becomes an official price merely because an explanatory vendor URL is attached. Known same-offering first-party disagreements withhold the qualified quote and produce an unresolved forecast component. Imported observed costs and supplied contract rates retain their separate provenance.

## Authentic Databricks sources

`npm run refresh:databricks` fetches fixed HTTPS endpoints used by the official pricing pages:

- [Product price cards](https://www.databricks.com/en-pricing-assets/data/pricing/cards.json).
- [AWS calculator data](https://www.databricks.com/en-pricing-assets/data/pricing/AWS.json).
- [Google Cloud calculator data](https://www.databricks.com/en-pricing-assets/data/pricing/GCP.json).

The script rejects alternate endpoints, credentials and redirects. It normalizes only explicitly mapped USD/DBU dimensions. It retains exact response bytes, hashes, source observation dates and row or JSON-pointer locators. Calculator hour examples are checked against their DBU basis. Incompatible units, unsupported offerings, conflicting duplicate values and first-party disagreements remain excluded or quarantined. A substantial loss of accepted coverage fails the refresh before replacing the stored data.

`npm run check:sources` runs offline. It validates dimensions and monetary units, replays the parsers against retained responses, and compares the complete normalized snapshot. Changing a price independently of its captured source fails this check. A successful replay proves snapshot consistency, not that the vendor has kept the same price since capture. Product availability, negotiated discounts and tariff effective dates are not inferred from a capture date.

The 2026-10-19 capture contains 1,059 accepted USD/DBU observations. Twenty-one same-key disagreements between official sources are quarantined, including eleven within the currently supported AWS/GCP catalog regions. Some serving discrepancies can involve displayed precision; they still require reconciliation before an unqualified exact quote.

## Azure Retail Prices

The unauthenticated [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) supplies commercial-cloud USD list prices. `scripts/refresh-prices.mjs` queries each supported region for curated Linux VM SKUs and Databricks Consumption meters. DBU names are explicitly mapped in `scripts/parse-prices.mjs`; Photon, trial, POC, incompatible currencies and nonzero minimum-quantity bands are excluded.

Each fetched DBU row records its own `asOf`, meter ID, effective start date, raw API unit, primary-region flag and filtered lookup URL. An API raw unit of `1 Hour` on a DBU meter describes its source representation; it is not a VM-hour. The engine normalizes the matched Databricks meter to USD/DBU. Non-primary-region flags are preserved; the parser does not reinterpret them as a different billing unit.

Pagination follows `NextPageLink`. Reaching the safety limit with pages remaining fails instead of accepting a partial snapshot. A 429 is retried with bounded backoff. Regions run three at a time. A partial or failed refresh keeps unmatched previous meters with their original per-meter dates; a new file-wide timestamp never refreshes those observations. Legacy rows without a per-meter date retain an unknown observation date.

All 530 mapped DBU meters across the 39 supported Azure regions were fetched on 2026-10-19 with their meter IDs and price metadata. VM observations retain their own dates.

## Live comparison on 2026-10-22

A read-only comparison against the first-party endpoints found that the AWS and GCP Databricks calculator responses matched the retained captures byte for byte. The price-card response had changed bytes, but replay produced the same 1,059 accepted rates, no accepted-price changes or removals, and the same 226 quarantined issues. The Azure Retail Prices API returned matching meter IDs and prices for all 530 stored DBU rows across the 39 supported regions, with no failed region lookups.

This is a dated comparison of those DBU sources. It does not revalidate every VM observation, Spot estimate, GCP seed, consumption conversion or regional planning factor, and does not establish product availability. The retained capture and per-meter observation dates remain 2026-10-19; a review does not rewrite source history.

## Cloud infrastructure and consumption

**AWS Price List:** the refresh streams public regional EC2 offer CSVs and retains Linux shared on-demand rows for the curated machines. Windows, reserved terms and incompatible tenancy are excluded. Two regions run at a time. `SKIP_AWS=1` skips the large VM downloads. A VM move outside 0.2–5 times the previous price is rejected pending review.

**AWS Spot Advisor:** savings percentages produce planning hourly estimates, not live availability-zone quotes. The stored estimate applies only while the workload uses the catalog default spot setting. Cross-region VM fallbacks do not inherit a Spot price.

**Google Cloud Billing Catalog:** when `GCP_BILLING_API_KEY` is provided, machine prices resolve core and memory SKUs by family, region and OnDemand usage type. Without it, GCP machine rows remain labeled seeds. This key is unrelated to the public Databricks GCP DBU price capture and must not be committed.

**Instance consumption:** `data/instances.json` remains curated. The dollar-price pipeline does not import every instance rating from the official calculator captures. Azure published non-Photon counts retain their source; manual values and Photon factors remain planning inputs unless separately verified. Databricks Labs LakeMeter-OSS is not used.

## Weekly review workflow

`.github/workflows/weekly-catalog.yml` runs Mondays at 06:00 UTC and on demand. Default repository permissions remain read-only; the job can update its review branch and PR. It never merges.

1. Validate the installed catalog and price inputs.
2. Capture and normalize the official Databricks data; fail unsafe or substantial coverage changes.
3. Refresh Azure meters and AWS VM offers, plus GCP VMs when configured.
4. Check allowed RSS, robots, sitemap and Azure meter-name signals for catalog changes.
5. Diff primary observations, VM rates, Azure meters and fallback tables. Report moves over 20%, additions, removals and quarantined issues.
6. Bump the product catalog version when inputs change and write the weekly summary.
7. Verify source captures, rebuild confidence/coverage reports, and regenerate both unit-cost artifacts.
8. Open or update the single `weekly-catalog` review PR with normalized data, raw captures and generated outputs.
9. Open or update the existing research issue for new metadata signals requiring citations.

`--offline` performs no network requests and is intended for tests. A dry run without `--apply` writes nothing.

## Commands

```sh
npx vite-node scripts/weekly-catalog.ts --offline
npm run refresh:databricks
npm run check:sources
npm run refresh-prices
node scripts/rate-confidence.mjs
node scripts/coverage-report.mjs
npm run export:unit-costs
npm run check:unit-costs
```

[Unit-cost documentation](UNIT-COSTS.md) explains evidence labels, component calculations and remaining coverage gaps. [NOTICE](../NOTICE) records source attribution.
