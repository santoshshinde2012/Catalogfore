import type { Portfolio, Workload } from "@cayfore/engine";

export function portfolioShell(name: string, workloads: Workload[]): Portfolio {
  return {
    version: 1,
    name,
    cloud: "aws",
    region: "us-east-1",
    tier: "premium",
    workloads,
    commitment: { dbuDiscount: 0, cloudDiscount: 0 },
    addon: "none",
    usageScale: 1,
    forecast: {
      months: 24,
      annualGrowth: 0.08,
      seasonality: "flat",
      customSeasonality: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
  };
}
