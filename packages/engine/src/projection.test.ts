import { describe, expect, it } from "vitest";
import { estimate } from "./estimate.js";
import { holtWintersForecast } from "./forecast/holt-winters.js";
import { fitUsageForecast } from "./forecast/series.js";
import { roundMoney } from "./money.js";
import {
  blankPortfolio,
  decodePortfolio,
  detachSimple,
  encodePortfolio,
  normalizePortfolio,
  parseSavedForecast,
  repricePortfolio,
} from "./portfolio.js";
import { forecastProducts, workloadForProduct } from "./products.js";
import { projectPortfolio } from "./projection.js";
import { recommendations, applyRecommendation } from "./recommend.js";
import { defaultPlan, planFromUsage, planForSpend, projectSimple, withCommit, withGrowth } from "./simple/project.js";
import { publishedPhotonMultiplier } from "./rates/photon.js";
import type { Portfolio, Workload } from "./types.js";

describe("canonical financial projection", () => {
  it("applies already-active planning events once in product totals", () => {
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      workloads: [{ id: "storage", name: "Storage", kind: "storage", gbMonth: 1000, managed: true }],
      forecast: { months: 12, annualGrowth: 0.2, seasonality: "flat", startMonth: "2027-01" },
      events: [{ id: "expand", name: "Expand storage", month: "2027-01", usageMultiplier: 2 }],
    };
    const projection = projectPortfolio(portfolio);
    for (const baseline of [estimate(portfolio), projection.estimate]) {
      const products = forecastProducts(baseline, portfolio);
      expect(products.monthly).toBe(projection.points[0].total);
      expect(products.year).toBe(projection.annual);
      expect(products.lines[0].year).toBe(projection.annual);
    }
  });

  it("keeps offsetting imported product charges visible when the total is zero", () => {
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
      workloads: [100, -100].map((amount, index) => ({
        id: `charge-${index}`,
        name: index ? "Credit" : "Usage",
        kind: "metered",
        sku: "jobs_classic",
        dbuPerMonth: amount,
        fixedUsdByCloud: { aws: amount },
        rateProvenance: { kind: "imported", label: "Invoice", currency: "USD", basis: "billed" },
      })),
    };
    const products = forecastProducts(estimate(portfolio), portfolio);
    expect(products.monthly).toBe(0);
    expect(products.lines.map((line) => line.monthly)).toEqual([100, -100]);
    expect(products.lines.map((line) => line.year)).toEqual([1200, -1200]);
  });

  it("assigns add-ons to eligible products without changing imported net costs", () => {
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      addon: "compliance",
      commitment: { dbuDiscount: 0.5, cloudDiscount: 0 },
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
      workloads: ["billed", "list"].map((basis, index) => ({
        id: basis,
        name: basis,
        kind: "metered",
        sku: "jobs_classic",
        dbuPerMonth: 100,
        fixedUsdByCloud: { aws: index ? 100 : 80 },
        rateProvenance: { kind: "imported", label: "Invoice", currency: "USD", basis: basis as "billed" | "list" },
      })),
    };
    const products = forecastProducts(estimate(portfolio), portfolio);
    expect(products.monthly).toBe(135);
    expect(products.lines.map((line) => line.monthly)).toEqual([80, 55]);
    expect(products.lines.map((line) => line.year)).toEqual([960, 660]);
  });

  it.each([10, 999])("reconciles add-on rounding across %i small charges without reducing a billed import", (count) => {
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      addon: "compliance",
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
      workloads: [
        ...Array.from({ length: count }, (_, index): Workload => ({
          id: `charge-${index}`,
          name: `Usage ${index}`,
          kind: "metered",
          sku: "jobs_classic",
          dbuPerMonth: 0.05,
          fixedUsdByCloud: { aws: 0.05 },
          rateProvenance: { kind: "imported", label: "List cost", currency: "USD", basis: "list" },
        })),
        {
          id: "billed",
          name: "Billed cost",
          kind: "metered",
          sku: "jobs_classic",
          dbuPerMonth: 1,
          fixedUsdByCloud: { aws: 1 },
          rateProvenance: { kind: "imported", label: "Invoice", currency: "USD", basis: "billed" },
        },
      ],
    };
    const projection = projectPortfolio(portfolio);
    const products = forecastProducts(projection.estimate, portfolio);
    expect(products.lines.at(-1)).toMatchObject({ monthly: 1, year: 12 });
    expect(products.lines.slice(0, -1).every((line) => line.monthly === 0.05 || line.monthly === 0.06)).toBe(true);
    expect(roundMoney(products.lines.reduce((sum, line) => sum + line.monthly, 0))).toBe(products.monthly);
    expect(roundMoney(products.lines.reduce((sum, line) => sum + line.year, 0))).toBe(projection.annual);
    expect(products.monthly).toBe(projection.points[0].total);
    if (count === 10) expect(products.monthly).toBe(1.55);
  });

  it("recomputes add-ons when an event changes a previously offsetting baseline", () => {
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      addon: "compliance",
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat", startMonth: "2027-01" },
      workloads: [100, -100].map((amount, index) => ({
        id: `charge-${index}`,
        name: index ? "Credit" : "Usage",
        kind: "metered",
        sku: "jobs_classic",
        dbuPerMonth: amount,
        fixedUsdByCloud: { aws: amount },
        rateProvenance: { kind: "imported", label: "List cost", currency: "USD", basis: "list" },
      })),
      events: [{ id: "expand", name: "Expand", month: "2027-02", workloadId: "charge-0", usageMultiplier: 2 }],
    };
    const projection = projectPortfolio(portfolio);
    expect(projection.points[0].total).toBe(0);
    expect(projection.points[1]).toMatchObject({ dbuCost: 100, addonCost: 10, total: 110 });
    const products = forecastProducts(projection.estimate, portfolio);
    expect(products.lines.map((line) => line.monthly)).toEqual([110, -110]);
    expect(products.year).toBe(projection.annual);
  });

  it("reconciles fitted totals, components, annual range and product attribution to cents", () => {
    const base = defaultPlan();
    const projection = projectSimple({
      ...base,
      usageForecast: {
        method: "log-linear",
        mape: 0,
        holdout: 3,
        monthlyGrowth: 0.02,
        ratios: Array.from({ length: 12 }, (_, index) => ({
          low: 1 + index * 0.02,
          expected: 1 + index * 0.02,
          high: 1 + index * 0.02,
        })),
      },
    });
    expect(projection.points.map((point) => point.total)).toEqual(projection.months.map((month) => month.expected));
    expect(projection.hasUnpriced).toBe(false);
    expect(projection.annual).toBe(roundMoney(projection.points.reduce((sum, point) => sum + point.total, 0)));
    projection.points.forEach((point) =>
      expect(point.total).toBe(roundMoney(point.dbuCost + point.cloudCost + point.addonCost)),
    );
    expect(projection.band.low).toBe(roundMoney(projection.months.reduce((sum, point) => sum + point.low, 0)));
    expect(projection.band.high).toBeGreaterThan(projection.annual);
    const products = forecastProducts(projection.estimate, projection.portfolio);
    expect(products.year).toBe(projection.annual);
    expect(roundMoney(products.lines.reduce((sum, line) => sum + line.year, 0))).toBe(products.year);
    for (const recommendation of recommendations(projection.portfolio)) {
      const applied = detachSimple(applyRecommendation(projection.portfolio, recommendation.id));
      expect(roundMoney(projection.annual - projectPortfolio(applied).annual)).toBe(recommendation.annualSavings);
    }
  });

  it("recomputes Genie promotions for the forecast calendar and applies events only when due", () => {
    const genie = workloadForProduct("assistant_agent");
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      workloads: [genie],
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat", startMonth: "2027-01" },
    };
    const result = projectPortfolio(portfolio);
    expect(result.points[0].period).toBe("2027-01");
    expect(result.points[1].dbuCost).toBeCloseTo(result.points[0].dbuCost / 0.75, 1);
    const changed = projectPortfolio({
      ...portfolio,
      events: [{ id: "retire", name: "Retire", month: "2027-03", workloadId: genie.id, usageMultiplier: 0 }],
    });
    expect(changed.points[1].total).toBe(result.points[1].total);
    expect(changed.points.slice(2).every((point) => point.total === 0)).toBe(true);
    expect(projectPortfolio(portfolio)).toEqual(result);
  });

  it("exposes unknown prices as an incomplete known subtotal", () => {
    const portfolio = { ...blankPortfolio("gcp"), workloads: [workloadForProduct("lakebase")] };
    const result = projectPortfolio(portfolio);
    expect(result.estimate.lines[0].priceStatus).toBe("unpriced");
    expect(result.estimate.coverage?.complete).toBe(false);
    expect(result.hasUnpriced).toBe(true);
    expect(result.estimate.warnings.join(" ")).toMatch(/known subtotal/);
    expect(
      estimate({
        ...portfolio,
        workloads: portfolio.workloads.map((workload) => ({ ...workload, priceStatus: "priced" })),
      }).lines[0].priceStatus,
    ).toBe("unpriced");
  });

  it("aligns imported model ratios to absolute forecast months", () => {
    const base = projectSimple(defaultPlan()).portfolio;
    const ratios = Array.from({ length: 12 }, (_, index) => ({
      low: 1 + index / 10,
      expected: 1 + index / 10,
      high: 1 + index / 10,
    }));
    if (!base.simple) throw new Error("Expected simple metadata");
    const portfolio: Portfolio = {
      ...base,
      simple: {
        ...base.simple,
        usageForecast: {
          method: "log-linear",
          mape: null,
          holdout: 0,
          monthlyGrowth: 0,
          originPeriod: "2027-01",
          ratios,
        },
      },
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat", startMonth: "2027-04" },
    };
    const result = projectPortfolio(portfolio);
    expect(result.points[0].total).toBeCloseTo(result.estimate.total * 1.3, 1);
    expect(result.points[9].period).toBe("2028-01");
    expect(result.points[9].total).toBe(result.estimate.total);
    expect(result.assumptions.join(" ")).toContain("outside its fitted window");
  });

  it("keeps prices, cloud and currency checks in the public quick import compatibility API", () => {
    const file = (price: number, currency = "USD") =>
      `sku_name,usage_quantity,usage_unit,list_price,currency_code,cloud\nPREMIUM_JOBS_COMPUTE,100,DBU,${price},${currency},AZURE\n`;
    const low = planFromUsage(defaultPlan(), file(0.1));
    const high = planFromUsage(defaultPlan(), file(10));
    expect(low.ok && high.ok).toBe(true);
    if (!low.ok || !high.ok) return;
    const lowResult = projectSimple(low.plan);
    expect(lowResult.estimate.total).toBe(10);
    expect(lowResult.estimate.cloudCost).toBe(0);
    expect(lowResult.portfolio.cloud).toBe("azure");
    expect(projectSimple(high.plan).estimate.total).toBe(1000);
    expect(projectSimple(withCommit(low.plan, 0.37)).estimate.total).toBe(6.3);
    expect(projectSimple(withGrowth(low.plan, -0.05)).points[1].total).toBe(9.5);
    expect(planForSpend(low.plan, 500).importedPortfolio).toBeUndefined();
    expect(planFromUsage(defaultPlan(), file(0.1, "EUR")).ok).toBe(false);
  });
});

describe("saved plan integrity", () => {
  it.each([24, 36] as const)("preserves all %i fitted months through saved JSON and share links", (months) => {
    const portfolio = projectSimple(defaultPlan()).portfolio;
    if (!portfolio.simple) throw new Error("Expected simple metadata");
    portfolio.forecast = { ...portfolio.forecast, months, startMonth: "2027-01" };
    portfolio.simple.usageForecast = {
      method: "log-linear",
      mape: null,
      holdout: 0,
      monthlyGrowth: 0.01,
      originPeriod: "2027-01",
      ratios: Array.from({ length: months }, (_, index) => ({ low: 1, expected: 1 + index / 100, high: 2 })),
    };
    for (const original of [portfolio, detachSimple(portfolio)]) {
      const parsed = parseSavedForecast(JSON.parse(JSON.stringify(original)));
      expect(parsed.ok).toBe(true);
      const shared = decodePortfolio(encodePortfolio(original));
      expect(shared).not.toBeNull();
      for (const restored of [parsed.ok ? parsed.value : null, shared]) {
        if (!restored) throw new Error("Expected restored forecast");
        expect(projectPortfolio(restored).points).toEqual(projectPortfolio(original).points);
      }
    }
  });

  it("preserves declining growth and an explicitly zero budget on save and reopen", () => {
    const projection = projectSimple(withGrowth(defaultPlan(), -0.2));
    const portfolio = { ...projection.portfolio, budgetAnnual: 0 };
    expect(projection.points[1].total).toBeCloseTo(projection.points[0].total * 0.8, 1);
    const reopened = decodePortfolio(encodePortfolio(portfolio));
    expect(reopened?.budgetAnnual).toBe(0);
    expect(reopened?.simple?.monthlyGrowth).toBe(-0.2);
    expect(reopened && projectPortfolio(reopened).annual).toBe(projection.annual);
  });

  it("does not apply discounts or add-ons twice to effective and billed imports", () => {
    const net: Workload = {
      id: "net",
      name: "Imported net cost",
      kind: "metered",
      sku: "jobs_classic",
      dbuPerMonth: 100,
      fixedUsdByCloud: { aws: 80 },
      rateProvenance: { kind: "imported", label: "Invoice", currency: "USD", basis: "billed" },
    };
    const list: Workload = {
      ...net,
      id: "list",
      name: "List cost",
      fixedUsdByCloud: { aws: 100 },
      rateProvenance: { kind: "imported", label: "Published list", currency: "USD", basis: "list" },
    };
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      workloads: [net, list],
      addon: "compliance",
      commitment: { dbuDiscount: 0.5, cloudDiscount: 0 },
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
    };
    const result = estimate(portfolio);
    expect(result.lines.map((line) => line.dbuCost)).toEqual([80, 50]);
    expect(result.addonCost).toBe(5);
    expect(projectPortfolio(portfolio).listMonthly).toBe(190);
    const changed = projectPortfolio({
      ...portfolio,
      events: [
        { id: "retire", name: "Retire list workload", month: "2026-11", workloadId: "list", usageMultiplier: 0 },
      ],
    });
    expect(changed.points[1].total).toBe(80);
    expect(changed.points[1].addonCost).toBe(0);
  });

  it("keeps a saved price-book reference until explicit repricing", () => {
    const portfolio = { ...blankPortfolio(), priceBook: { version: "older-price-book", verifiedOn: "2025-01-01" } };
    const result = estimate(portfolio);
    expect(result.warnings.join(" ")).toContain("older book is unavailable");
    expect(decodePortfolio(encodePortfolio(portfolio))?.priceBook?.version).toBe("older-price-book");
    const accepted = repricePortfolio(portfolio);
    expect(accepted.priceBook?.version).toBe(result.catalogVersion);
    expect(estimate(accepted).warnings.join(" ")).not.toContain("older book is unavailable");
  });
  it("rejects unrelated, malformed and future-version saved data", () => {
    const valid = projectSimple(defaultPlan()).portfolio;
    expect(parseSavedForecast(valid).ok).toBe(true);
    expect(parseSavedForecast({ format: "cayfore.forecast", version: 1, portfolio: valid }).ok).toBe(true);
    for (const invalid of [
      {},
      { ...valid, version: 2 },
      { ...valid, workloads: [{ kind: "cluster" }] },
      { ...valid, forecast: { ...valid.forecast, startMonth: "2026-13" } },
      { ...valid, commitment: { dbuDiscount: Number.NaN, cloudDiscount: 0 } },
    ]) {
      expect(parseSavedForecast(invalid).ok).toBe(false);
    }
  });

  it("rehydrates catalog rates, requires labelled custom rates and preserves imported corrections", () => {
    const product = workloadForProduct("zerobus");
    const crafted = { ...product, kind: "metered", units: 10, rateByPlacement: { aws: { premium: 1000 } } };
    const catalog = normalizePortfolio({ ...blankPortfolio(), workloads: [crafted] });
    const priced = estimate(catalog);
    expect(priced.total).toBeLessThan(10000);
    expect(priced.lines[0].rateProvenance?.kind).toBe("catalog");
    const unknown: Workload = {
      id: "custom",
      name: "Contract",
      kind: "metered",
      sku: "managed_services",
      dbuPerMonth: 10,
      rateByCloud: { aws: 1000 },
    };
    const unlabelled = estimate(normalizePortfolio({ ...blankPortfolio(), workloads: [unknown] }));
    expect(unlabelled.lines[0].priceStatus).toBe("unpriced");
    const custom = { ...unknown, rateProvenance: { kind: "custom", label: "Signed contract", currency: "USD" } };
    expect(estimate(normalizePortfolio({ ...blankPortfolio(), workloads: [custom] })).total).toBe(10000);
    const claimedFree = estimate(
      normalizePortfolio({ ...blankPortfolio(), workloads: [{ ...custom, priceStatus: "free" }] }),
    );
    expect(claimedFree.lines[0].priceStatus).toBe("priced");
    const correction = {
      ...unknown,
      dbuPerMonth: -10,
      fixedUsdByCloud: { aws: -5 },
      rateByCloud: undefined,
      rateProvenance: { kind: "imported", label: "Usage correction", currency: "USD" },
    };
    const result = estimate(normalizePortfolio({ ...blankPortfolio(), workloads: [correction] }));
    expect(result.dbu).toBe(-10);
    expect(result.total).toBe(-5);
    const credit = projectPortfolio(normalizePortfolio({ ...blankPortfolio(), workloads: [correction] }));
    expect(credit.months[0].low).toBeLessThan(credit.months[0].expected);
    expect(credit.months[0].high).toBeGreaterThan(credit.months[0].expected);
    expect(credit.assumptions.join(" ")).toContain("net credit");
  });

  it("keeps ownership in local saved JSON and omits it from share links", () => {
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      usage: {
        source: "system-billing",
        selectedMonth: "2026-09",
        costBasis: "list",
        currency: "USD",
        observedMonths: [{ period: "2026-09", amount: 100 }],
        observedUnit: "usd",
        coverage: { pricedRows: 1, unpricedRows: 0, usedRows: 1, skippedRows: 0 },
        warnings: [],
        attribution: [
          { key: "alice@example.com", label: "Alice", amount: 100, quantity: 10, rows: 1, unpricedRows: 0 },
        ],
      },
    };
    expect(parseSavedForecast(portfolio).ok).toBe(true);
    const duplicate = {
      ...portfolio,
      usage: {
        ...portfolio.usage,
        observedMonths: [...(portfolio.usage?.observedMonths ?? []), ...(portfolio.usage?.observedMonths ?? [])],
      },
    };
    expect(parseSavedForecast(duplicate).ok).toBe(false);
    expect(
      parseSavedForecast({
        ...portfolio,
        usage: { ...portfolio.usage, coverage: { usedRows: 1, skippedRows: -1, pricedRows: 1, unpricedRows: 0 } },
      }).ok,
    ).toBe(false);
    expect(decodePortfolio(encodePortfolio(portfolio))?.usage?.attribution).toBeUndefined();
    expect(portfolio.usage?.attribution).toHaveLength(1);
    expect(decodePortfolio(encodePortfolio(portfolio))?.usage?.observedMonths).toEqual(portfolio.usage?.observedMonths);
  });
});

describe("calendar-aware fitting", () => {
  it("uses elapsed calendar months and keeps zero observations", () => {
    const months = Array.from({ length: 6 }, (_, index) => ({
      period: new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 7),
      amount: 100 * Math.pow(1.1, index),
    }));
    const spaced = months.map((point, index) => ({
      ...point,
      period: new Date(Date.UTC(2024, index * 4, 1)).toISOString().slice(0, 7),
    }));
    expect(fitUsageForecast({ months, days: [] })?.monthlyGrowth).toBeCloseTo(0.1, 3);
    expect(fitUsageForecast({ months: spaced, days: [] })?.monthlyGrowth).toBeCloseTo(Math.pow(1.1, 0.25) - 1, 3);
    expect(
      fitUsageForecast({
        months: months.map((point, index) => ({ ...point, amount: index === 0 ? 0 : point.amount })),
        days: [],
      }),
    ).not.toBeNull();
  });

  it("tunes Holt-Winters holdout parameters on the training window only", () => {
    const months = Array.from({ length: 36 }, (_, index) => ({
      period: new Date(Date.UTC(2023, index, 1)).toISOString().slice(0, 7),
      amount: 100 + (index % 12) * 4 + index * 2 + (index > 32 ? (index % 2) * 200 : 0),
    }));
    const training = holtWintersForecast(months.slice(0, -3));
    const full = holtWintersForecast(months);
    const anchor = months[months.length - 4].amount;
    const expectedMape =
      months
        .slice(-3)
        .reduce(
          (sum, actual, index) =>
            sum + Math.abs((training?.ratios[index].expected ?? 0) * anchor - actual.amount) / actual.amount,
          0,
        ) / 3;
    expect(full?.mape).toBeCloseTo(expectedMape, 10);
  });

  it("uses workload-specific published Photon factors", () => {
    expect(publishedPhotonMultiplier("azure", "jobs_classic")).toBe(2.5);
    expect(publishedPhotonMultiplier("azure", "dlt_core")).toBe(2.9);
    expect(publishedPhotonMultiplier("aws", "all_purpose_classic")).toBe(2);
  });
});
