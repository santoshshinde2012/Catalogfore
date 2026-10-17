# Unit costs and source evidence

Cayfore's **Unit costs** menu explains the bundled cost of one billing or operational unit, the dimensions that change it, and the source behind it. Enter a quantity to calculate a component subtotal. Use Product map or Advanced to add a supported product to a forecast when you need schedules, growth, commitments, and other charges. This is source-cost visibility; it does not assume business value or ROI.

The inventory covers all **70 current pricing-catalog products and 8 learning-only platform concepts**. It is a curated snapshot, not a complete worldwide Databricks tariff, every current model, or an availability guarantee. Rates are USD list-price bases before contract discounts, tax, and excluded services.

## Files and commands

- [unit-costs.json.gz](../data/unit-costs.json.gz): losslessly compressed JSON inventory with component, placement, dimension, price, and provenance fields.
- [unit-costs.csv.gz](../data/unit-costs.csv.gz): the same inventory as a losslessly compressed flat CSV table for spreadsheets and joins.
- [unit-cost-evidence.json](../data/unit-cost-evidence.json): maintained source registry, source scopes, review dates, and known conflicts.
- [RESEARCH.md](RESEARCH.md): the existing calculator's detailed pricing assumptions.

```sh
# Rebuild both deterministic files from the bundled catalog.
npm run export:unit-costs

# Fail if checked-in exports no longer match their inputs.
npm run check:unit-costs

# Query the same inventory without opening the website. JSON is the default.
npm run cayfore -- rates --format csv --product jobs_classic --cloud azure --region eastus --tier premium
```

Generation reads local catalog inputs; it does not fetch live prices or use a customer's account. Source review dates describe what was checked, while stored rate dates describe the underlying snapshot. Rebuilding a file does not make its rates newly verified. Cloud-price refreshes and manually researched consumption changes remain separate maintenance actions.

`export:unit-costs` writes ordinary `data/unit-costs.csv` and `data/unit-costs.json` files for local use, plus the versioned `.gz` copies. The expanded grid repeats evidence across many placement and variant combinations, so the repository stores compressed copies to keep updates small. Decompress either copy with a standard archive tool or `gzip -dk data/unit-costs.csv.gz` (use the JSON filename for JSON). The website and CLI download ordinary CSV/JSON without requiring decompression. CI expands the committed copies and compares their complete contents against the current builder.

## Read the units before calculating

Each row describes one **product, component, cloud, region, tier, and variant**. Components can include DBUs, a VM, storage, tokens, or an infrastructure assumption. Variants can include warehouse size, machine, GPU, model, input/output direction, endpoint type, or page complexity. Multiple variants are alternatives; they are not all charges to add to one workload.

`unitQuantity` states the quoted quantity, and `usdPerUnit` is normalized to one raw unit. A display quote for one million tokens can therefore coexist with a precise dollars-per-token value. Preserve precision while multiplying and round the final subtotal for display. Do not round a small token price to zero before calculating.

For example, the bundled **Azure Premium East US Jobs** rate is **$0.30/DBU**. A measured 100 DBU costs **$30 in Databricks charges**. That does not mean a cluster costs $0.30 per hour: each machine has its own DBU/hour consumption, and classic Jobs also needs the cloud VM charge. Photon changes DBU consumption; it does not change this $/DBU rate.

Another example: Azure's medium Apps consumption is 0.5 DBU/hour. At the bundled East US Interactive Serverless price of $0.95/DBU, compute is **$0.475 per app-hour**; 32 hours is **$15.20** before excluded services and discounts. The consumption rule and dollar meter have different sources. [Azure consumption rules](https://learn.microsoft.com/en-us/azure/databricks/resources/pricing), [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices).

DBUs already imported from billing are the billed consumption after service multipliers. Applying the Data Quality, Data Classification, or Genie metering adjustment a second time overstates or understates cost. For networking charges, Databricks defines 1 GB as 2^30 bytes; do not silently join that quantity to a decimal-GB dataset. [Databricks pricing definitions](https://www.databricks.com/product/pricing).

## What a price includes

Classic clusters and SQL Classic/Pro require infrastructure in addition to Databricks DBUs. Serverless compute includes its compute infrastructure in the DBU basis; storage, networking, connected models, and other services can remain separate. SQL's bundled VM-equivalence figure is explicitly an assumption, not a published machine tariff.

A unit-cost quantity calculation is a **component subtotal**. Select the matching components and dimensions before totaling. For example, do not add every SQL warehouse size, both input token variants for different models, a whole composed agent product plus its identical child services, or both on-demand and Spot for the same VM hour. Search storage allowances and Genie eligibility can also make a flat quantity-times-price calculation incomplete.

Missing prices use JSON `null` and an empty numeric CSV cell. Missing, conflicted, excluded, or unsupported charges are not $0 services. Learning-only concepts such as Unity Catalog, Delta Lake, and Photon point to underlying billable services rather than inventing a standalone fee. A documented free component still needs its eligibility and expiry conditions.

## Evidence and coverage limits

The source registry records the role of each link: a dollar meter, a consumption conversion, a tariff, explanatory documentation, or a secondary compilation. A page explaining a product is not proof of every numeric rate on that product. Confidence belongs to the resolved **component and placement**, not merely to the product name.

- **Regional DBUs:** exact Azure meters take precedence. AWS/GCP reference prices and fallback regions retain secondary or proxy labels. Lakehouse Real-Time regional ratios are product-specific; applying those ratios to other SKUs remains a planning assumption, even if a stored region source is named `lakehouse-rt`. [Lakehouse Real-Time Beta pricing](https://docs.databricks.com/aws/en/compute/sql-warehouse/real-time-pricing).
- **VMs and Spot:** AWS offer-file and Azure meter rates retain their own dates. GCP VM seeds and reference-region fallbacks are identified. Advisor-derived AWS Spot estimates are not live availability-zone quotes. [AWS Price List](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html), [Spot price history](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances-history.html).
- **Foundation models:** the current provisioned heading is DBU/hour **per 50 model units**, with workload-dependent throughput. GTE is a source conflict: the bundled/Azure Learn value is 20, while the current Databricks page gives 100 on its quoted basis. An unqualified operational quote must remain unresolved. Current cache, priority, batch, reservation, context, residency, and additional-model dimensions are not comprehensively modeled. [Foundation Model Serving pricing](https://www.databricks.com/product/pricing/foundation-model-serving).
- **Search storage:** the flat standard/optimized storage values and standard allowance are bundled assumptions. Azure's documented DSU rule differs from the stored flat rate. Compute-unit examples on the AI Search page do not verify every stored storage price. [AI Search pricing](https://www.databricks.com/product/pricing/ai-search).
- **Networking:** the current price page links an official tariff effective August 2024; it includes charges that Cayfore does not model. Current documents also differ on endpoint-hour billing timing. Describe omitted rates as missing calculator coverage, rather than claiming no public tariff exists. [Current networking price page](https://www.databricks.com/product/pricing/data-transfer-connectivity), [dated official tariff](https://www.databricks.com/sites/default/files/2024-08/databricks-data-transfer-pricing.pdf).
- **Photon and add-ons:** Photon factors are consumption assumptions by cloud and workload. The forecast's 10%/30% add-on scenarios are not equivalent to the Azure API's dollars-per-DBU meters. These are separately labeled planning bases, and duplicate product charges must be avoided.
- **Genie promotions:** user and service-principal rules differ. The 150 DBU user allowance, One/Agents free window through January 31, 2027, and Code metering promotion do not create one universal free or per-user price. SQL and connected services remain separate. [Genie billing and eligibility](https://docs.databricks.com/aws/en/genie/monitor-cost).

The unit-cost work exposes these limits without silently rewriting the established forecast rates or formulas. Review an actual `system.billing.list_prices` export and your cloud bill when reconciling an invoice.

## Join and maintain the data

Use stable product/component IDs and explicit cloud, region, tier, unit, and dimension columns; labels can change. Preserve source IDs and dates in downstream tables. Do not join a source's raw `1 Hour` meter label to a VM hour without checking what that meter actually monetizes. Do not aggregate rows across variants as if they were usage records.

For customer billing, resolve prices by SKU, cloud, currency, usage unit, and the effective time interval. Keep `pricing.default`, promotional prices, and `pricing.effective_list.default` distinct; keep contract overrides separate. Free Genie usage can legitimately have no matching price-table row. [Databricks pricing system table reference](https://docs.databricks.com/aws/en/admin/system-tables/pricing).

When updating the inventory, verify the source's exact offering, unit basis, region, currency, eligibility, and effective date; update the maintained input and its evidence; rebuild both exports; and run the consistency check. A newly added catalog product or dimension must appear in the inventory with either a sourced rate or an explicit unresolved reason. Price coverage is not product-availability coverage.
