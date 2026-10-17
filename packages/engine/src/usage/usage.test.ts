import { describe, expect, it, vi } from "vitest";
import * as csvModule from "../csv.js";
import { estimate } from "../estimate.js";
import { decodePortfolio, encodePortfolio, blankPortfolio } from "../portfolio.js";
import { workloadsFromUsage } from "../products.js";
import {
  attributeUsageRecords,
  importUsageCsv,
  parseUsageRecords,
  portfolioFromUsage,
  previewUsageImport,
  selectUsageMonth,
} from "../usage.js";

const options = { asOf: "2026-10-17" };
const header = "sku_name,cloud,usage_date,usage_quantity,usage_unit,list_price,currency_code,record_type";
const jobs = (date: string, quantity: number, price = "0.15", currency = "USD", recordType = "ORIGINAL") =>
  `PREMIUM_JOBS_COMPUTE,AWS,${date},${quantity},DBU,${price},${currency},${recordType}`;
const csv = (...rows: string[]) => [header, ...rows].join("\n");

describe("shared usage import pipeline", () => {
  it("parses an import once and reselects a month from typed records", () => {
    const spy = vi.spyOn(csvModule, "parseCsv");
    try {
      const preview = previewUsageImport(csv(jobs("2026-08-15", 100), jobs("2026-09-15", 200)), options);
      expect(spy).toHaveBeenCalledTimes(1);
      const august = selectUsageMonth(preview, "2026-08");
      expect(august.monthlyDollars).toBe(15);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(estimate(portfolioFromUsage(august).portfolio).total).toBe(15);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("uses one latest closed calendar month even with sparse billing dates", () => {
    const preview = previewUsageImport(csv(jobs("2026-08-15", 100), jobs("2026-09-15", 100)), options);
    expect(preview.completeMonths).toEqual(["2026-08", "2026-09"]);
    expect(preview.selectedMonth).toBe("2026-09");
    expect(preview.dbu).toBe(100);
    expect(estimate(portfolioFromUsage(preview).portfolio).total).toBe(15);
    expect(preview.history.months.map((month) => month.amount)).toEqual([15, 15]);
  });

  it("excludes the unfinished current month from both baseline and fitted history", () => {
    const complete = csv(jobs("2026-09-15", 100));
    const trailing = `${complete}\n${jobs("2026-10-16", 50)}`;
    const before = previewUsageImport(complete, options);
    const after = previewUsageImport(trailing, options);
    expect(after.selectedMonth).toBe("2026-09");
    expect(after.history.months).toEqual(before.history.months);
    expect(after.history.days).toEqual(before.history.days);
    expect(estimate(portfolioFromUsage(after).portfolio).total).toBe(15);
    expect(after.warnings.join(" ")).toContain("not a complete observed month");
  });

  it("requires explicit selection of a partial-only input and does not invent a full-month value", () => {
    const preview = previewUsageImport(csv(jobs("2026-10-16", 50), jobs("2026-10-20", 20)), options);
    expect(preview.selectedMonth).toBeNull();
    expect(preview.usedRows).toBe(0);
    expect(() => portfolioFromUsage(preview)).toThrow(/Select a month/);
    const selected = selectUsageMonth(preview, "2026-10");
    expect(selected.monthlyDollars).toBe(7.5);
    expect(selected.usedRows).toBe(1);
    expect(selected.warnings.join(" ")).toContain("not extrapolated");
  });

  it("handles leap days and rejects invalid date and month inputs", () => {
    const preview = previewUsageImport(csv(jobs("2024-02-29", 10), jobs("2025-02-29", 10)), options);
    expect(preview.selectedMonth).toBe("2024-02");
    expect(preview.skippedRows).toBe(1);
    expect(() => previewUsageImport(csv(jobs("2026-09-01", 1)), { asOf: "2026-02-30" })).toThrow(/asOf/);
    expect(() => selectUsageMonth(preview, "2026-13")).toThrow(/YYYY-MM/);
  });

  it("nets original, retraction and restatement signed quantities without flipping corrections", () => {
    const text = csv(
      jobs("2026-09-15", 100),
      jobs("2026-09-15", -100, "0.15", "USD", "RETRACTION"),
      jobs("2026-09-15", 80, "0.15", "USD", "RESTATEMENT"),
    );
    const preview = previewUsageImport(text, options);
    expect(preview.dbu).toBe(80);
    expect(preview.monthlyDollars).toBe(12);
    expect(preview.history.months).toEqual([{ period: "2026-09", amount: 12 }]);
    expect(estimate(portfolioFromUsage(preview).portfolio).dbu).toBe(80);
  });

  it("preserves signed credit-only actuals through a saved portfolio", () => {
    const { portfolio } = portfolioFromUsage(csv(jobs("2026-09-15", -20, "0.15", "USD", "RETRACTION")), options);
    expect(estimate(portfolio).total).toBe(-3);
    const restored = decodePortfolio(encodePortfolio(portfolio));
    expect(restored).not.toBeNull();
    expect(estimate(restored!).total).toBe(-3);
  });

  it("retains partial-price quantities and prices classic jobs with the classic jobs rate", () => {
    const preview = previewUsageImport(csv(jobs("2026-09-15", 100, "0.10"), jobs("2026-09-16", 100, "")), options);
    expect(preview.products[0]).toMatchObject({
      quantity: 200,
      dollars: 10,
      unpricedQuantity: 100,
      pricedRows: 1,
      unpricedRows: 1,
    });
    expect(preview.history.unit).toBe("dbu");
    expect(preview.history.months[0]?.amount).toBe(200);
    const imported = portfolioFromUsage(preview);
    expect(imported.portfolio.workloads).toHaveLength(2);
    expect(imported.portfolio.workloads.map((workload) => (workload.kind === "metered" ? workload.sku : ""))).toEqual([
      "jobs_classic",
      "jobs_classic",
    ]);
    expect(estimate(imported.portfolio).total).toBe(25);
  });

  it("keeps zero-priced free usage and preserves DBU quantities", () => {
    const preview = previewUsageImport(csv(jobs("2026-09-15", 100, "0")), options);
    expect(preview.pricedRows).toBe(1);
    expect(preview.unpricedRows).toBe(0);
    expect(preview.monthlyDollars).toBe(0);
    expect(estimate(portfolioFromUsage(preview).portfolio)).toMatchObject({ dbu: 100, total: 0 });
    expect(workloadsFromUsage(preview).workloads[0]?.priceStatus).toBe("free");
  });

  it("retains unsupported non-DBU quantities as explicitly unpriced workloads", () => {
    const preview = previewUsageImport(`${header}\nUNKNOWN,AWS,2026-09-15,100,TOKEN,,USD,ORIGINAL`, options);
    const loaded = workloadsFromUsage(preview);
    expect(loaded.workloads[0]).toMatchObject({
      priceStatus: "unpriced",
      inputs: { usageQuantity: 100, usageUnit: "TOKEN", sourceSku: "UNKNOWN" },
    });
    expect(estimate(portfolioFromUsage(preview).portfolio).total).toBe(0);
    expect(loaded.warnings.join(" ")).toContain("100 TOKEN remains unpriced");
  });

  it("retains monetary costs for unknown product names", () => {
    const preview = previewUsageImport(`${header}\nUNKNOWN,AWS,2026-09-15,100,TOKEN,0.02,USD,ORIGINAL`, options);
    expect(preview.unmapped[0]?.dollars).toBe(2);
    expect(estimate(portfolioFromUsage(preview).portfolio).total).toBe(2);
  });

  it("preserves mixed cloud placement without multiplying the bill", () => {
    const preview = previewUsageImport(
      `${csv(jobs("2026-09-15", 100))}\nPREMIUM_JOBS_COMPUTE,AZURE,2026-09-15,200,DBU,0.30,USD,ORIGINAL`,
      options,
    );
    const { portfolio } = portfolioFromUsage(preview, { base: blankPortfolio("gcp") });
    expect(portfolio.workloads.map((workload) => workload.cloud)).toEqual(["azure", "aws"]);
    expect(estimate(portfolio).total).toBe(75);
  });

  it("rejects non-USD prices and unsupported clouds with actionable errors", () => {
    expect(() => previewUsageImport(csv(jobs("2026-09-15", 1e308, "1e308")), options)).toThrow(/numeric range/);
    expect(() => previewUsageImport(csv(jobs("2026-09-15", 10, "0.15", "EUR")), options)).toThrow(
      /Unsupported billing currency EUR/,
    );
    expect(() => previewUsageImport(`${header}\nJOBS,ALI,2026-09-15,10,DBU,0.15,USD,ORIGINAL`, options)).toThrow(
      /Unsupported cloud/,
    );
  });

  it("keeps undated aggregates compatible and reports their unverifiable period", () => {
    const result = importUsageCsv("sku_name,usage_quantity\nPREMIUM_JOBS_COMPUTE,10", options);
    expect(result.dbu).toBe(10);
    expect(result.warnings.join(" ")).toContain("completeness cannot be verified");
  });

  it("preserves nested and flattened attribution fields locally", () => {
    const quoted = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const text = [
      "sku_name,usage_date,usage_quantity,list_price,custom_tags,workspace_id,identity_metadata.run_as,usage_metadata.job_id,product_features",
      [
        "PREMIUM_JOBS_COMPUTE",
        "2026-09-15",
        "100",
        "0.15",
        quoted('{"team":"Data","cost_center":"123"}'),
        "42",
        "alice",
        "job-1",
        quoted('{"is_serverless":true}'),
      ].join(","),
    ].join("\n");
    const preview = previewUsageImport(text, options);
    expect(preview.records[0]).toMatchObject({
      tags: { team: "Data", cost_center: "123" },
      identity: { run_as: "alice" },
      metadata: { job_id: "job-1" },
      features: { is_serverless: "true" },
    });
    expect(preview.attribution[0]).toMatchObject({ label: "Data", amount: 15 });
    expect(attributeUsageRecords(preview.records, "workspace")[0]?.label).toBe("42");
    const { portfolio } = portfolioFromUsage(preview);
    expect(portfolio.usage?.attribution?.[0]?.label).toBe("Data");
    expect(JSON.stringify(portfolio)).not.toContain("alice");
  });

  it("rejects malformed or oversized nested metadata", () => {
    expect(() => parseUsageRecords('sku_name,usage_quantity,custom_tags\nJOBS,1,"{bad}"')).toThrow(/invalid JSON/);
    expect(() => parseUsageRecords(`sku_name,usage_quantity,custom_tags\nJOBS,1,${"a".repeat(64_001)}`)).toThrow(
      /too large/,
    );
    expect(() => parseUsageRecords('sku_name,usage_quantity,custom_tags\nJOBS,1,"{""__proto__"":""bad""}"')).toThrow(
      /plain data/,
    );
  });

  it("prevents duplicate month appends after save/reopen and intervening imports", () => {
    const first = previewUsageImport(csv(jobs("2026-08-15", 100)), options);
    const second = previewUsageImport(csv(jobs("2026-09-15", 100)), options);
    const base = portfolioFromUsage(first).portfolio;
    const combined = portfolioFromUsage(second, { base, mode: "append" }).portfolio;
    const restored = decodePortfolio(encodePortfolio(combined));
    expect(() => portfolioFromUsage(first, { base: restored!, mode: "append" })).toThrow(/already in the portfolio/);
    expect(estimate(portfolioFromUsage(first, { base: restored!, mode: "replace" }).portfolio).total).toBe(15);
  });
});

describe("FOCUS cost imports", () => {
  const focusHeader =
    "ChargePeriodStart,ChargePeriodEnd,ServiceName,SkuId,ServiceProviderName,ConsumedQuantity,ConsumedUnit,BilledCost,EffectiveCost,BillingCurrency,Tags";
  it.each(["Amazon Web Services", "Microsoft Azure", "Google Cloud"])(
    "imports %s exported effective cost with labelled provenance",
    (provider) => {
      const preview = previewUsageImport(
        `${focusHeader}\n2026-09-01T00:00:00Z,2026-10-01T00:00:00Z,Databricks,SERVERLESS_SQL,${provider},100,DBU,70,60,USD,team=Analytics`,
        options,
      );
      expect(preview.source).toBe("focus");
      expect(preview.costBasis).toBe("effective");
      expect(preview.monthlyDollars).toBe(60);
      expect(preview.attribution[0]?.label).toBe("Analytics");
      expect(estimate(portfolioFromUsage(preview).portfolio).total).toBe(60);
      const billed = previewUsageImport(
        `${focusHeader}\n2026-09-01T00:00:00Z,2026-10-01T00:00:00Z,Databricks,SERVERLESS_SQL,${provider},100,DBU,70,60,USD,`,
        { ...options, costBasis: "billed" },
      );
      expect(billed.monthlyDollars).toBe(70);
      expect(billed.costBasis).toBe("billed");
    },
  );

  it("accepts billed-only FOCUS exports and rejects multi-month charges", () => {
    expect(() =>
      previewUsageImport(`${focusHeader}\n2026-09-01T00:00:00Z,invalid,Databricks,SQL,AWS,100,DBU,70,60,USD,`, options),
    ).toThrow(/ChargePeriodEnd/);
    const text = "ChargePeriodStart,BilledCost,BillingCurrency,ServiceName\n2026-09-01,25,USD,Databricks";
    expect(previewUsageImport(text, options)).toMatchObject({
      source: "focus",
      monthlyDollars: 25,
      costBasis: "billed",
    });
    expect(() =>
      previewUsageImport(
        `${focusHeader}\n2026-08-01T00:00:00Z,2026-10-01T00:00:00Z,Databricks,SQL,AWS,100,DBU,70,60,USD,`,
        options,
      ),
    ).toThrow(/multiple calendar months/);
  });

  it("preserves credit and zero-cost FOCUS rows with no synthetic DBU charges", () => {
    const preview = previewUsageImport(
      `${focusHeader}\n2026-09-01T00:00:00Z,2026-09-02T00:00:00Z,Databricks,UNKNOWN,AWS,0,COST,-10,-10,USD,\n2026-09-02T00:00:00Z,2026-09-03T00:00:00Z,Databricks,UNKNOWN,AWS,0,COST,0,0,USD,`,
      options,
    );
    expect(preview.pricedRows).toBe(2);
    expect(preview.monthlyDollars).toBe(-10);
    expect(estimate(portfolioFromUsage(preview).portfolio).total).toBe(-10);
  });
});
