import { describe, expect, it } from "vitest";
import { estimate } from "./estimate.js";
import { blankPortfolio } from "./portfolio.js";
import { forecastProducts, productById, workloadForProduct } from "./products.js";
import type { Workload } from "./types.js";

function priced(workload: Workload) {
  return estimate({ ...blankPortfolio("aws"), region: "us-east-1", tier: "premium", workloads: [workload] });
}

describe("product catalog", () => {
  it("prices classic jobs with the cluster strategy", () => {
    const workload = workloadForProduct("jobs_classic");
    expect(workload.productId).toBe("jobs_classic");
    expect(workload.kind).toBe("cluster");
    const result = priced(workload);
    expect(result.lines[0]?.sku).toBe("jobs_classic");
    expect(result.dbuCost).toBeGreaterThan(0);
    expect(result.cloudCost).toBeGreaterThan(0);
  });

  it("does not invent a rate for an unpublished product", () => {
    expect(productById("genie")?.listPrice).toBe("unpublished");
    expect(priced(workloadForProduct("genie")).total).toBe(0);
    expect(priced(workloadForProduct("ai_parse_document")).total).toBe(0);
    expect(priced(workloadForProduct("zerobus")).total).toBe(0);
  });

  it("prices data quality as automated serverless DBU", () => {
    expect(priced(workloadForProduct("data_quality")).dbuCost).toBe(70);
  });

  it("prices Jobs Light on Azure only", () => {
    const workload = workloadForProduct("jobs_light");
    const azure = estimate({
      ...blankPortfolio("azure"),
      region: "eastus",
      tier: "premium",
      workloads: [workload],
    });
    expect(azure.dbuCost).toBe(22);
    expect(priced(workload).total).toBe(0);
  });

  it("prices one Clean Rooms collaborator-day on Azure only", () => {
    const workload = workloadForProduct("clean_rooms");
    const azure = estimate({
      ...blankPortfolio("azure"),
      region: "eastus",
      tier: "premium",
      workloads: [workload],
    });
    expect(azure.total).toBe(50);
    expect(priced(workload).total).toBe(0);
  });

  it("prices point-in-time restore at 8.7 times the DSU rate", () => {
    const result = priced(workloadForProduct("lakebase_pitr"));
    expect(result.dbuCost).toBe(0);
    expect(result.cloudCost).toBe(10);
  });

  it("uses the serverless jobs rate for performance mode and says the mode is unpublished", () => {
    expect(productById("jobs_performance_mode")?.published).toBe(false);
    expect(priced(workloadForProduct("jobs_performance_mode")).total).toBe(
      priced(workloadForProduct("jobs_serverless")).total,
    );
  });

  it("splits the 12-month forecast across products", () => {
    const portfolio = {
      ...blankPortfolio("aws"),
      region: "us-east-1",
      workloads: [workloadForProduct("jobs_classic"), workloadForProduct("clean_rooms")],
    };
    const result = estimate(portfolio);
    const breakdown = forecastProducts(result, portfolio);
    expect(breakdown.monthly).toBe(result.total);
    expect(breakdown.lines).toHaveLength(2);
    expect(breakdown.lines[1]?.monthly).toBe(0);
    const yearSum = Math.round(breakdown.lines.reduce((sum, line) => sum + line.year, 0) * 100) / 100;
    expect(yearSum).toBe(breakdown.year);
  });
});
