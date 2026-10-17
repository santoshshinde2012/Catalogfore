import { describe, expect, it } from "vitest";
import { estimate } from "./estimate.js";
import { blankPortfolio } from "./portfolio.js";
import {
  forecastProducts,
  geniePromoFactor,
  genieUserUsageFree,
  productById,
  recomputeProduct,
  workloadForProduct,
  workloadsForProduct,
  workloadsFromUsage,
} from "./products.js";
import type { Cloud, Workload } from "./types.js";

function priced(workload: Workload, cloud: Cloud = "aws") {
  return estimate({
    ...blankPortfolio(cloud),
    region: cloud === "aws" ? "us-east-1" : cloud === "azure" ? "eastus" : "us-central1",
    tier: "premium",
    workloads: [workload],
  });
}

function pricedAll(productId: string, cloud: Cloud = "aws") {
  return estimate({
    ...blankPortfolio(cloud),
    region: cloud === "aws" ? "us-east-1" : cloud === "azure" ? "eastus" : "us-central1",
    tier: "premium",
    workloads: workloadsForProduct(productId),
  });
}

describe("product catalog", () => {
  it("prices Zerobus per GB from the secondary card and leaves GCP unpriced", () => {
    expect(productById("zerobus")?.confidence).toBe("secondary");
    expect(productById("zerobus")?.confidenceScore).toBe(55);
    expect(priced(workloadForProduct("zerobus")).total).toBe(5);
    const enterprise = estimate({
      ...blankPortfolio("aws"),
      region: "us-east-1",
      tier: "enterprise",
      workloads: [workloadForProduct("zerobus")],
    });
    expect(enterprise.total).toBe(6.4);
    expect(priced(workloadForProduct("zerobus"), "azure").total).toBe(6.4);
    const gcp = priced(workloadForProduct("zerobus"), "gcp");
    expect(gcp.total).toBe(0);
    expect(gcp.lines[0]?.notes.join(" ")).toMatch(/No list rate is stored/);
  });

  it("prices classic jobs with the cluster strategy", () => {
    const workload = workloadForProduct("jobs_classic");
    expect(workload.productId).toBe("jobs_classic");
    expect(workload.kind).toBe("cluster");
    const result = priced(workload);
    expect(result.lines[0]?.sku).toBe("jobs_classic");
    expect(result.dbuCost).toBeGreaterThan(0);
    expect(result.cloudCost).toBeGreaterThan(0);
  });

  it("leaves a line at $0 only when nothing billable is published", () => {
    for (const id of ["databricks_one", "private_link", "nat_gateway", "delta_sharing"]) {
      expect(productById(id)?.listPrice).toBe("unpublished");
      expect(pricedAll(id).total).toBe(0);
    }
  });

  it("prices Genie Code above the 150 DBU allowance and leaves Genie LLM free inside the window", () => {
    const code = priced(workloadForProduct("assistant_agent"));
    const excess = Math.max(0, 10 * 200 - 10 * 150) * geniePromoFactor();
    expect(code.dbuCost).toBe(Math.round(excess * 0.07 * 100) / 100);
    const genie = pricedAll("genie");
    const llm = genie.lines.find((line) => line.name === "Genie LLM");
    const sql = genie.lines.find((line) => line.name === "Genie SQL warehouse");
    expect(llm?.dbuCost).toBe(genieUserUsageFree() ? 0 : llm?.dbuCost);
    expect(sql?.dbu).toBe(100);
    expect(sql?.dbuCost).toBe(70);
  });

  it("prices ai_parse_document at the midpoint of the selected band", () => {
    expect(priced(workloadForProduct("ai_parse_document")).total).toBe(875);
    const edited = recomputeProduct({
      ...workloadForProduct("ai_parse_document"),
      inputs: { pages: 1000, complexity: "high" },
    });
    expect(priced(edited).total).toBe(6125);
  });

  it("prices a launch as one model-serving DBU and Azure data processed at $0.02/GB", () => {
    expect(priced(workloadForProduct("serving_launch_charge")).total).toBe(7);
    expect(priced(workloadForProduct("data_processed"), "azure").total).toBe(2);
    expect(priced(workloadForProduct("data_processed"), "aws").total).toBe(0);
  });

  it("composes Agent Bricks from serving, vector search, and training", () => {
    const result = pricedAll("agent_bricks");
    expect(result.lines.map((line) => line.name)).toEqual([
      "Agent Bricks serving",
      "Agent Bricks vector search",
      "Agent Bricks training",
    ]);
    expect(result.total).toBe(319.8);
  });

  it("prices other foundation models only after a DBU-per-million figure is entered", () => {
    expect(priced(workloadForProduct("fm_other")).total).toBe(0);
    const entered = recomputeProduct({
      ...workloadForProduct("fm_other"),
      inputs: { inputTokens: 1_000_000, outputTokens: 0, inputDbuPerMillion: 10, outputDbuPerMillion: 0 },
    });
    expect(priced(entered).total).toBe(0.7);
  });

  it("maps a usage export onto a product forecast", () => {
    const csv = [
      "sku_name,billing_origin_product,usage_quantity,usage_unit,list_price",
      "PREMIUM_JOBS_COMPUTE,JOBS,10,DBU,0.15",
      "PREMIUM_SERVERLESS_SQL,SQL,4,DBU,0.70",
      "SOMETHING_NEW,UNKNOWN,3,DBU,1",
    ].join("\n");
    const loaded = workloadsFromUsage(csv);
    expect(loaded.unmapped).toEqual(["SOMETHING_NEW"]);
    expect(loaded.workloads.map((workload) => workload.productId)).toEqual([
      "sql_serverless",
      "jobs_classic",
      undefined,
    ]);
    const result = estimate({
      ...blankPortfolio("aws"),
      region: "us-east-1",
      tier: "premium",
      workloads: loaded.workloads,
    });
    expect(result.total).toBe(7.3);
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
