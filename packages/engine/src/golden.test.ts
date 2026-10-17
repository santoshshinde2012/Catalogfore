import { describe, expect, it } from "vitest";
import { regionalSkuRate, vmHourly } from "./catalog.js";
import { estimate } from "./estimate.js";
import { MONTH_WEEKS, formatUsd, roundMoney } from "./money.js";
import { blankPortfolio } from "./portfolio.js";
import { defaultPlan, planForSpend, projectSimple } from "./simple/project.js";
import type { Workload } from "./types.js";

const hours = 8 * 5 * MONTH_WEEKS;

describe("golden prices", () => {
  it("matches the published multiplication for an AWS classic job", () => {
    const portfolio = blankPortfolio();
    portfolio.forecast.annualGrowth = 0;
    const workload: Workload = {
      id: "job",
      name: "Nightly",
      kind: "cluster",
      sku: "jobs_classic",
      instanceId: "m5.xlarge",
      scale: { min: 2, max: 2, utilization: 1 },
      photon: false,
      spotShare: 0,
      spotDiscount: 0.6,
      schedule: { hoursPerDay: 8, daysPerWeek: 5 },
    };
    portfolio.workloads = [workload];
    const dbu = 3 * 0.69 * hours;
    const dbuCost = roundMoney(dbu * 0.15);
    const cloudCost = roundMoney(3 * 0.192 * hours);
    const result = estimate(portfolio);
    expect(result.dbuCost).toBe(dbuCost);
    expect(result.cloudCost).toBe(cloudCost);
    expect(dbuCost).toBe(53.82);
    expect(cloudCost).toBe(99.84);
  });

  it("matches the Azure jobs FAQ arithmetic with the Retail Prices VM rate", () => {
    const portfolio = blankPortfolio();
    portfolio.cloud = "azure";
    portfolio.region = "eastus";
    portfolio.forecast.annualGrowth = 0;
    const workload: Workload = {
      id: "job",
      name: "Jobs",
      kind: "cluster",
      sku: "jobs_classic",
      instanceId: "Standard_DS13_v2",
      scale: { min: 0, max: 0, utilization: 1 },
      photon: false,
      spotShare: 0,
      spotDiscount: 0.6,
      schedule: { hoursPerDay: 8, daysPerWeek: 5 },
    };
    portfolio.workloads = [workload];
    const result = estimate(portfolio);
    expect(regionalSkuRate("azure", "eastus", "premium", "jobs_classic")).toBe(0.3);
    expect(vmHourly("azure", "eastus", "Standard_DS13_v2").hourly).toBe(0.741);
    expect(result.dbuCost).toBe(roundMoney(2 * hours * 0.3));
    expect(result.cloudCost).toBe(roundMoney(0.741 * hours));
  });

  it("falls back when a region has no meter for that SKU", () => {
    expect(regionalSkuRate("azure", "eastus", "premium", "managed_services")).toBeNull();
    expect(regionalSkuRate("aws", "us-east-1", "premium", "ai_search")).toBeNull();
    expect(vmHourly("aws", "us-east-1", "missing.instance").source).toBe("missing");
  });
});

describe("edges", () => {
  it("formats zero, a normal total, a negative, and a huge amount as USD", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(11997)).toBe("$11,997");
    expect(formatUsd(-12.5)).toBe("-$12.50");
    expect(formatUsd(1e12)).toBe("$1,000,000,000,000");
    expect(roundMoney(Number.NaN)).toBe(0);
  });

  it("keeps zero and a huge starting amount finite", () => {
    const zero = projectSimple(planForSpend(defaultPlan(), 0));
    expect(zero.annual).toBe(0);
    expect(formatUsd(zero.annual)).toBe("$0.00");
    const huge = projectSimple(planForSpend(defaultPlan(), 1_000_000_000));
    expect(Number.isFinite(huge.annual)).toBe(true);
    expect(huge.annual).toBeGreaterThan(0);
  });
});
