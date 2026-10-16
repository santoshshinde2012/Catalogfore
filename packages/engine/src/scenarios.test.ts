import { describe, expect, it } from "vitest";
import { estimate } from "./estimate.js";
import { roundMoney } from "./money.js";
import { blankPortfolio } from "./portfolio.js";
import { forecastProducts, workloadsForProduct } from "./products.js";
import type { Cloud, Portfolio, Tier } from "./types.js";

function portfolio(ids: string[], cloud: Cloud, tier: Tier): Portfolio {
  return {
    ...blankPortfolio(cloud),
    region: cloud === "aws" ? "us-east-1" : "eastus",
    tier,
    workloads: ids.flatMap((id) => workloadsForProduct(id)),
  };
}

describe("realistic forecasts", () => {
  it("prices a startup analytics stack from published serverless and storage rates", () => {
    const plan = portfolio(["jobs_serverless", "sql_serverless", "managed_storage"], "aws", "premium");
    const result = estimate(plan);
    const jobs = result.lines.find((line) => line.name === "Serverless jobs");
    const sql = result.lines.find((line) => line.name === "SQL warehouse");
    const storage = result.lines.find((line) => line.name === "Managed storage");
    // 8 DBU/h × 8h × 5d × 52/12 × $0.35
    expect(jobs?.dbuCost).toBe(roundMoney(((8 * 8 * 5 * 52) / 12) * 0.35));
    // Size S is 12 DBU/h, scale 1–2 at 45% is 1.45 warehouses, serverless includes compute, $0.70/DBU
    expect(sql?.dbuCost).toBe(roundMoney(12 * 1.45 * ((8 * 5 * 52) / 12) * 0.7));
    expect(storage?.cloudCost).toBe(roundMoney(500 * 0.023));
    expect(result.total).toBe(2608.03);
    expect(forecastProducts(result, plan).year).toBeGreaterThan(result.total);
  });

  it("prices an enterprise ETL stack and checks the serverless jobs line by hand", () => {
    const plan = portfolio(["jobs_classic", "dlt_pro", "jobs_serverless"], "aws", "enterprise");
    const result = estimate(plan);
    const serverless = result.lines.find((line) => line.name === "Serverless jobs");
    // Enterprise jobs serverless is $0.45/DBU. Same 8 DBU/h schedule as the startup line.
    expect(serverless?.dbuCost).toBe(roundMoney(((8 * 8 * 5 * 52) / 12) * 0.45));
    expect(result.dbuCost).toBeGreaterThan(serverless?.dbuCost ?? 0);
    expect(result.cloudCost).toBeGreaterThan(0);
    expect(result.total).toBe(roundMoney(result.dbuCost + result.cloudCost));
    expect(result.lines.map((line) => [line.name, line.dbuCost, line.cloudCost, line.total])).toEqual([
      ["Jobs cluster", 100.46, 139.78, 240.24],
      ["Lakeflow pipeline", 2375.1, 1022.11, 3397.21],
      ["Serverless jobs", 624, 0, 624],
    ]);
    expect(result.total).toBe(4261.45);
  });

  it("prices a GenAI app as Agent Bricks underlying SKUs", () => {
    const plan = portfolio(["agent_bricks"], "aws", "premium");
    const result = estimate(plan);
    expect(result.lines.map((line) => roundMoney(line.total))).toEqual([50.96, 203.84, 65]);
    expect(result.total).toBe(319.8);
  });

  it("prices a BI stack from Genie and dashboard assumptions", () => {
    const plan = portfolio(["genie", "ai_bi_dashboards"], "aws", "premium");
    const result = estimate(plan);
    const llm = result.lines.find((line) => line.name === "Genie LLM");
    const sql = result.lines.find((line) => line.name === "Genie SQL warehouse");
    const dashboards = result.lines.find((line) => line.name === "AI/BI Dashboards");
    expect(llm?.total).toBe(0);
    // 10 users × 40 questions × 0.25 assumed SQL DBU × $0.70
    expect(sql?.total).toBe(70);
    // 20 viewers × 22 refreshes × 1 assumed SQL DBU × $0.70
    expect(dashboards?.total).toBe(308);
    expect(result.total).toBe(378);
  });

  it("prices OLTP as Lakebase, an app, and a branch", () => {
    const plan = portfolio(["lakebase", "databricks_apps", "lakebase_branches"], "aws", "premium");
    const result = estimate(plan);
    const lakebase = result.lines.find((line) => line.name === "Lakebase");
    const app = result.lines.find((line) => line.name === "Databricks App");
    const compute = result.lines.find((line) => line.name === "Branch compute");
    const storage = result.lines.find((line) => line.name === "Branch storage");
    // 2 CU × 16h × 7d × 52/12 × $0.111, plus 50 GB × $0.345
    expect(lakebase?.total).toBe(roundMoney(((2 * 16 * 7 * 52) / 12) * 0.111 + 50 * 0.345));
    // Medium app is 0.5 DBU/h × 10h × 5d × 52/12 × $0.75
    expect(app?.total).toBe(roundMoney(((0.5 * 10 * 5 * 52) / 12) * 0.75));
    // 1 CU × 8h × 5d × 52/12 × $0.111
    expect(compute?.total).toBe(roundMoney(((1 * 8 * 5 * 52) / 12) * 0.111));
    // 10 GB × $0.023 DSU × 15
    expect(storage?.total).toBe(roundMoney(10 * 0.023 * 15));
    expect(result.total).toBe(228.93);
    const gcp = estimate({
      ...portfolio(["lakebase"], "aws", "premium"),
      cloud: "gcp",
      region: "us-central1",
    });
    expect(gcp.total).toBe(0);
    expect(gcp.lines[0]?.notes.some((note) => /not priced/i.test(note))).toBe(true);
  });
});
