import { describe, expect, it } from "vitest";
import { estimate } from "../estimate.js";
import { skuCatalog } from "../catalog.js";
import { projectPortfolio } from "../projection.js";
import { blankPortfolio, normalizePortfolio } from "../portfolio.js";
import { forecastProducts } from "../products.js";
import { portfolioFromUsage, previewUsageImport, selectUsageMonth } from "../usage.js";

const options = { asOf: "2026-10-17" };

describe("source-to-projection monetary reconciliation", () => {
  it("uses the deterministic catalog date unless an application supplies an observation date", () => {
    const input = "sku_name,usage_quantity,usage_date\nPREMIUM_JOBS_COMPUTE,100,2026-09-15";
    expect(previewUsageImport(input).asOf).toBe(skuCatalog.verifiedOn);
    expect(previewUsageImport(input, { asOf: "2026-10-17" }).asOf).toBe("2026-10-17");
  });
  it("reconciles exported corrections, promotion rates, catalog gaps, unknown charges and cloud placement", () => {
    const input = [
      "record_id,ingestion_date,sku_name,cloud,usage_date,usage_quantity,usage_unit,list_price,effective_list_price,currency_code,record_type,custom_tags",
      "old,2026-08-16,PREMIUM_JOBS_COMPUTE,AWS,2026-08-15,100,DBU,0.15,0.12,USD,ORIGINAL,team=Data",
      "original,2026-09-16,PREMIUM_JOBS_COMPUTE,AWS,2026-09-15,100,DBU,0.15,0.10,USD,ORIGINAL,team=Data",
      "original,2026-09-17,PREMIUM_JOBS_COMPUTE,AWS,2026-09-15,-100,DBU,0.15,0.10,USD,RETRACTION,team=Data",
      "restated,2026-09-17,PREMIUM_JOBS_COMPUTE,AWS,2026-09-15,80,DBU,0.15,0.10,USD,RESTATEMENT,team=Data",
      "sql,2026-09-16,SERVERLESS_SQL,AZURE,2026-09-15,20,DBU,0.70,0.60,USD,ORIGINAL,team=Analytics",
      "storage,2026-09-16,DATABRICKS_STORAGE,AWS,2026-09-15,100,GB,0.02,,USD,ORIGINAL,team=Platform",
      "token,2026-09-16,UNRECOGNIZED_MODEL,AWS,2026-09-15,50,TOKEN,0.001,,USD,ORIGINAL,team=AI",
      "gap,2026-09-16,PREMIUM_JOBS_COMPUTE,AWS,2026-09-15,100,DBU,,,USD,ORIGINAL,team=Data",
      "free,2026-09-16,GENIE_FREE_USAGE,AWS,2026-09-15,10,DBU,0.07,0,USD,ORIGINAL,team=AI",
      "unpriced,2026-09-16,UNKNOWN_UNIT,AWS,2026-09-15,5,TOKEN,,,USD,ORIGINAL,team=AI",
      "partial,2026-10-16,PREMIUM_JOBS_COMPUTE,AWS,2026-10-15,50,DBU,0.15,0.10,USD,ORIGINAL,team=Data",
    ].join("\n");
    const preview = previewUsageImport(input, options);
    expect(preview.selectedMonth).toBe("2026-09");
    expect(preview.monthlyDollars).toBe(22.05);
    expect(preview.dbu).toBe(210);
    expect(preview.pricedRows).toBe(7);
    expect(preview.unpricedRows).toBe(2);
    const imported = portfolioFromUsage(preview);
    const portfolio = { ...imported.portfolio, forecast: { ...imported.portfolio.forecast, annualGrowth: 0 } };
    const projection = projectPortfolio(portfolio);
    // $8 net jobs + $12 SQL + $2 storage + $0.05 tokens + $15 catalog-estimated jobs.
    expect(projection.estimate.total).toBe(37.05);
    expect(projection.estimate.dbu).toBe(210);
    expect(projection.points[0]).toMatchObject({ period: "2026-10", total: 37.05 });
    expect(projection.annual).toBe(444.6);
    expect(forecastProducts(projection.estimate, portfolio).year).toBe(444.6);
    expect(estimate(normalizePortfolio(JSON.parse(JSON.stringify(portfolio)))).total).toBe(37.05);
    expect(portfolio.usage?.forecast).toBeUndefined(); // Incomplete USD history cannot fit a monetary trend.
    expect(preview.attribution.reduce((sum, group) => sum + group.amount, 0)).toBeCloseTo(22.05, 10);
  });

  it("chooses effective-list promotions by default and supports an explicit default-list comparison", () => {
    const input =
      "sku_name,usage_quantity,usage_date,list_price,effective_list_price,currency_code\nGENIE_FREE_USAGE,100,2026-09-15,0.07,0,USD";
    const preview = previewUsageImport(input, options);
    expect(preview.records[0]).toMatchObject({
      listPrice: 0.07,
      effectiveListPrice: 0,
      cost: { basis: "effective-list", amount: 0 },
    });
    expect(estimate(portfolioFromUsage(preview).portfolio).total).toBe(0);
    const list = previewUsageImport(input, { ...options, costBasis: "list" });
    expect(list.monthlyDollars).toBe(7);
    expect(list.costBasis).toBe("list");
  });

  it("does not leak later observations into an earlier selected month's model", () => {
    const input = [
      "sku_name,usage_quantity,usage_date,list_price,currency_code",
      ...Array.from(
        { length: 8 },
        (_, index) => `PREMIUM_JOBS_COMPUTE,${100 + index * 10},2025-${String(index + 1).padStart(2, "0")}-15,0.15,USD`,
      ),
    ].join("\n");
    const preview = selectUsageMonth(previewUsageImport(input, options), "2025-06");
    expect(preview.history.months.at(-1)?.period).toBe("2025-06");
    expect(preview.history.months).toHaveLength(6);
    const { portfolio } = portfolioFromUsage(preview);
    expect(portfolio.forecast.startMonth).toBe("2025-07");
    expect(portfolio.usage?.forecast).toBeDefined();
    expect(projectPortfolio(portfolio).points[0]?.period).toBe("2025-07");
    const current = selectUsageMonth(
      previewUsageImport(`${input}\nPREMIUM_JOBS_COMPUTE,50,2026-10-15,0.15,USD`, options),
      "2026-10",
    );
    expect(portfolioFromUsage(current).portfolio.usage?.forecast).toBeUndefined();
  });

  it("keeps corrections with the same record ID, deduplicates exact repeated records and respects ingestion asOf", () => {
    const input = [
      "record_id,ingestion_date,sku_name,usage_quantity,usage_date,list_price,record_type,currency_code",
      "same,2026-09-16,PREMIUM_JOBS_COMPUTE,100,2026-09-15,0.15,ORIGINAL,USD",
      "same,2026-09-16,PREMIUM_JOBS_COMPUTE,100,2026-09-15,0.15,ORIGINAL,USD",
      "same,2026-09-17,PREMIUM_JOBS_COMPUTE,-100,2026-09-15,0.15,RETRACTION,USD",
      "fixed,2026-10-20,PREMIUM_JOBS_COMPUTE,80,2026-09-15,0.15,RESTATEMENT,USD",
    ].join("\n");
    const historical = previewUsageImport(input, options);
    expect(historical.usedRows).toBe(2);
    expect(historical.skippedRows).toBe(1);
    expect(historical.dbu).toBe(0);
    expect(historical.warnings.join(" ")).toMatch(/repeated billing records/);
    expect(historical.warnings.join(" ")).toMatch(/ingested after/);
    const later = previewUsageImport(input, { asOf: "2026-10-21" });
    expect(later.dbu).toBe(80);
    expect(later.monthlyDollars).toBe(12);
  });

  it("clears stale planning events on replacement and preserves them only for an explicit addition", () => {
    const first = portfolioFromUsage(
      "sku_name,usage_quantity,usage_date\nPREMIUM_JOBS_COMPUTE,100,2026-08-15",
      options,
    ).portfolio;
    const base = { ...first, events: [{ id: "old", name: "Old rollout", month: "2026-10", usageMultiplier: 2 }] };
    const preview = previewUsageImport(
      "sku_name,usage_quantity,usage_date\nPREMIUM_JOBS_COMPUTE,100,2026-09-15",
      options,
    );
    const replace = portfolioFromUsage(preview, { base });
    expect(replace.portfolio.events).toBeUndefined();
    expect(replace.warnings.join(" ")).toMatch(/events were cleared/);
    const added = portfolioFromUsage(preview, { base, mode: "append" });
    expect(added.portfolio.events).toEqual(base.events);
    expect(added.portfolio.forecast.startMonth).toBe("2026-09");
    expect(added.warnings.join(" ")).toMatch(/combined monthly scope/);
    expect(blankPortfolio().events).toBeUndefined();
  });
});
