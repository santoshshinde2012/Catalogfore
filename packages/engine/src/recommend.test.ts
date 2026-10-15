import { describe, expect, it } from "vitest";
import { estimate } from "./estimate.js";
import { blankPortfolio, decodePortfolio, encodePortfolio } from "./portfolio.js";
import { applyRecommendation, recommendations, uncertaintyBand } from "./recommend.js";
import type { Portfolio, Workload } from "./types.js";

function jobPortfolio(overrides: Partial<Extract<Workload, { kind: "cluster" }>> = {}): Portfolio {
  const portfolio = blankPortfolio();
  portfolio.forecast.annualGrowth = 0;
  portfolio.forecast.seasonality = "flat";
  portfolio.workloads = [
    {
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
      ...overrides,
    },
  ];
  return portfolio;
}

describe("recommendations", () => {
  it("prices serverless below classic for the reference job and spells the multiplication", () => {
    const portfolio = jobPortfolio();
    const result = estimate(portfolio);
    expect(result.lines[0].notes[0]).toContain("3 nodes (2 workers + 1 driver)");
    expect(result.lines[0].notes[0]).toContain("0.69 DBU/h");
    expect(result.lines[0].notes[0]).toContain("$0.15/DBU");
    expect(result.lines[0].notes[0]).toContain("region ×1");
    expect(result.lines[0].notes.some((note) => note.startsWith("VM $0.192/h"))).toBe(true);
    const recs = recommendations(portfolio);
    const serverless = recs.find((rec) => rec.id === "jobs_serverless");
    expect(serverless?.annualSavings).toBeGreaterThan(1);
    expect(recs.every((rec) => rec.annualSavings >= 1)).toBe(true);
    expect(recs.map((rec) => rec.annualSavings)).toEqual(
      [...recs.map((rec) => rec.annualSavings)].sort((a, b) => b - a),
    );
  });

  it("halves Photon hours once, and leaves notebooks off spot", () => {
    const portfolio = jobPortfolio();
    portfolio.workloads.push({
      id: "nb",
      name: "Notebooks",
      kind: "cluster",
      sku: "all_purpose_classic",
      instanceId: "m5.xlarge",
      scale: { min: 1, max: 1, utilization: 1 },
      photon: false,
      spotShare: 0,
      spotDiscount: 0.6,
      schedule: { hoursPerDay: 14, daysPerWeek: 5 },
    });
    const once = applyRecommendation(portfolio, "photon_speedup_2");
    const twice = applyRecommendation(once, "photon_speedup_2");
    const job = once.workloads.find((workload) => workload.id === "job");
    const notebooks = once.workloads.find((workload) => workload.id === "nb");
    expect(job?.kind === "cluster" && job.photon && job.schedule.hoursPerDay).toBe(4);
    expect(notebooks?.kind === "cluster" && notebooks.schedule.hoursPerDay).toBe(7);
    expect(estimate(twice).dbu).toBeCloseTo(estimate(once).dbu, 5);

    const spotted = applyRecommendation(portfolio, "spot_70");
    const spottedJob = spotted.workloads.find((workload) => workload.id === "job");
    const spottedNotes = spotted.workloads.find((workload) => workload.id === "nb");
    expect(spottedJob?.kind === "cluster" && spottedJob.spotShare).toBe(0.7);
    expect(spottedNotes?.kind === "cluster" && spottedNotes.spotShare).toBe(0);
    expect(recommendations(portfolio).some((rec) => rec.id === "autostop_notebooks")).toBe(true);
  });

  it("stops a pinned warehouse, drops one oversized node, and skips non-saving ideas", () => {
    const portfolio = jobPortfolio({ scale: { min: 6, max: 6, utilization: 1 } });
    portfolio.workloads.push({
      id: "sql",
      name: "Pinned",
      kind: "sql",
      edition: "classic",
      size: "m",
      scale: { min: 1, max: 1, utilization: 1 },
      schedule: { hoursPerDay: 24, daysPerWeek: 7 },
    });
    const stopped = applyRecommendation(portfolio, "autostop_sql");
    const sql = stopped.workloads.find((workload) => workload.id === "sql");
    expect(sql?.kind === "sql" && sql.schedule.hoursPerDay).toBe(10);
    expect(
      applyRecommendation(stopped, "autostop_sql").workloads.find((workload) => workload.id === "sql"),
    ).toMatchObject({
      schedule: { hoursPerDay: 10 },
    });
    const smaller = applyRecommendation(portfolio, "rightsize");
    const job = smaller.workloads.find((workload) => workload.id === "job");
    expect(job?.kind === "cluster" && job.scale.min).toBe(5);
    const ids = recommendations(portfolio).map((rec) => rec.id);
    expect(ids).toContain("autostop_sql");
    expect(ids).not.toContain("autostop_notebooks");
    const quiet = jobPortfolio({ scale: { min: 6, max: 6, utilization: 1 }, photon: true, spotShare: 0.7 });
    quiet.commitment = { dbuDiscount: 0.37, cloudDiscount: 0.3 };
    expect(recommendations(quiet).map((rec) => rec.id)).toContain("rightsize");
  });

  it("hides a commit that does not beat the current discount", () => {
    const portfolio = jobPortfolio();
    portfolio.commitment.dbuDiscount = 0.37;
    portfolio.commitment.cloudDiscount = 0.3;
    const ids = recommendations(portfolio).map((rec) => rec.id);
    expect(ids).not.toContain("commit_37");
    expect(ids).not.toContain("commit_37_cloud_30");
  });
});

describe("uncertainty band", () => {
  it("widens an uncalibrated estimate and tightens after a usage scale", () => {
    const portfolio = jobPortfolio();
    const result = estimate(portfolio);
    const open = uncertaintyBand(1200, portfolio, result);
    expect(open.calibrated).toBe(false);
    expect(open.low).toBe(1020);
    expect(open.expected).toBe(1200);
    expect(open.high).toBe(1440);
    portfolio.region = "sa-east-1";
    const wider = uncertaintyBand(1200, portfolio, estimate(portfolio));
    expect(wider.high).toBe(1536);
    portfolio.region = "us-east-1";
    portfolio.usageScale = 1.2;
    const tight = uncertaintyBand(1200, portfolio, estimate(portfolio));
    expect(tight.calibrated).toBe(true);
    expect(tight.low).toBe(1140);
    expect(tight.high).toBe(1272);
  });

  it("round-trips an optional budget and drops a missing or empty one", () => {
    const portfolio = jobPortfolio();
    portfolio.budgetAnnual = 50000;
    expect(decodePortfolio(encodePortfolio(portfolio))?.budgetAnnual).toBe(50000);
    delete portfolio.budgetAnnual;
    expect(decodePortfolio(encodePortfolio(portfolio))?.budgetAnnual).toBeUndefined();
    expect(decodePortfolio(encodePortfolio({ ...jobPortfolio(), budgetAnnual: 0 }))?.budgetAnnual).toBeUndefined();
  });
});
