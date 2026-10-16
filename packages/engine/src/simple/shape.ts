import { defaultInstanceId, referenceRegion, skuCatalog } from "../catalog.js";
import { defaultEstimateDependencies, type EstimateDependencies } from "../costing/estimate-portfolio.js";
import { estimate } from "../estimate.js";
import { FLAT_SEASONALITY, type UsageForecast } from "../forecast.js";
import { clamp, roundMoney } from "../money.js";
import type { Cloud, Portfolio, SimpleBasket, Tier, Workload, WorkloadMix } from "../types.js";
import { normalizeMix } from "./mix.js";

const DAY_HOURS = 8;
const DAYS = 5;
const OUTPUT_PER_INPUT = 0.25;
const PROBE_NODES = 10;
const PROBE_SQL = 10;
const PROBE_TOKENS = 10_000_000;

export interface SimplePlanInput {
  cloud: Cloud;
  tier: Tier;
  region: string;
  commitDiscount: number;
}

interface UnitCosts {
  etlPerNode: number;
  etlDbuPerNode: number;
  sqlPerCluster: number;
  sqlDbuPerCluster: number;
  mlPerToken: number;
  mlDbuPerToken: number;
}

export function annualGrowthFromMonthly(monthly: number): number {
  const rate = clamp(Number.isFinite(monthly) ? monthly : 0, 0, 0.2);
  return Math.pow(1 + rate, 12) - 1;
}

export function regionFor(cloud: Cloud, region: string): string {
  const known = skuCatalog.regions.some((item) => item.cloud === cloud && item.id === region);
  if (known) return region;
  return referenceRegion[cloud] ?? skuCatalog.regions.find((item) => item.cloud === cloud)?.id ?? region;
}

export function basketForSpend(
  input: SimplePlanInput,
  listSpend: number,
  mix: WorkloadMix,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): SimpleBasket {
  const units = probe(input, dependencies);
  const shares = normalizeMix(mix);
  const spend = Math.max(0, listSpend);
  return etlBasket(units, spend * shares.etl, spend * shares.sql, spend * shares.ml);
}

export function basketForDbu(
  input: SimplePlanInput,
  dbu: WorkloadMix,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): SimpleBasket {
  const units = probe(input, dependencies);
  const etlNodes = units.etlDbuPerNode > 0 ? Math.max(0, dbu.etl) / units.etlDbuPerNode : 0;
  const sqlClusters = units.sqlDbuPerCluster > 0 ? Math.max(0, dbu.sql) / units.sqlDbuPerCluster : 0;
  const mlInputTokens = units.mlDbuPerToken > 0 ? Math.max(0, dbu.ml) / units.mlDbuPerToken : 0;
  return finalizeEtl({ etlNodes, sqlClusters, mlInputTokens });
}

export function workloadsFromBasket(input: SimplePlanInput, basket: SimpleBasket): Workload[] {
  const workloads: Workload[] = [];
  if (basket.etlNodes > 0 && basket.etlHoursPerDay > 0) {
    const workers = basket.etlNodes >= 1 ? basket.etlNodes - 1 : 0;
    workloads.push({
      id: "mix-etl",
      name: "Pipelines and jobs",
      kind: "cluster",
      sku: "jobs_classic",
      instanceId: defaultInstanceId(input.cloud),
      scale: { min: snap(workers), max: snap(workers), utilization: 1 },
      photon: false,
      spotShare: 0,
      spotDiscount: skuCatalog.defaultSpotDiscount,
      schedule: { hoursPerDay: snap(basket.etlHoursPerDay), daysPerWeek: DAYS },
    });
  }
  if (basket.sqlClusters > 0) {
    workloads.push({
      id: "mix-sql",
      name: "Dashboards",
      kind: "sql",
      edition: "serverless",
      size: "s",
      scale: { min: snap(basket.sqlClusters), max: snap(basket.sqlClusters), utilization: 1 },
      schedule: { hoursPerDay: DAY_HOURS, daysPerWeek: DAYS },
    });
  }
  if (basket.mlInputTokens > 0) {
    workloads.push({
      id: "mix-ml",
      name: "Models",
      kind: "foundation_model",
      modelId: "llama-3.1-8b",
      inputTokensPerMonth: snap(basket.mlInputTokens),
      outputTokensPerMonth: snap(basket.mlInputTokens * OUTPUT_PER_INPUT),
      provisionedHoursPerMonth: 0,
    });
  }
  return workloads;
}

export function portfolioShell(
  input: SimplePlanInput & {
    monthlyGrowth: number;
    usageScale?: number;
    usageCalibrated?: boolean;
    usageDbu?: number;
    usageForecast?: UsageForecast;
    monthlySpend: number;
    mix: WorkloadMix;
    basket: SimpleBasket;
  },
  workloads: Workload[],
): Portfolio {
  const region = regionFor(input.cloud, input.region);
  return {
    version: 1,
    name: "Next year",
    cloud: input.cloud,
    region,
    tier: input.tier,
    workloads,
    commitment: { dbuDiscount: clamp(input.commitDiscount, 0, 0.95), cloudDiscount: 0 },
    addon: "none",
    usageScale: input.usageScale && input.usageScale > 0 ? input.usageScale : 1,
    ...(input.usageCalibrated ? { usageCalibrated: true } : {}),
    simple: {
      monthlySpend: roundMoney(Math.max(0, input.monthlySpend)),
      mix: normalizeMix(input.mix),
      monthlyGrowth: clamp(input.monthlyGrowth, 0, 0.2),
      commitDiscount: clamp(input.commitDiscount, 0, 0.95),
      basket: {
        etlNodes: snap(input.basket.etlNodes),
        etlHoursPerDay: snap(input.basket.etlHoursPerDay),
        sqlClusters: snap(input.basket.sqlClusters),
        mlInputTokens: snap(input.basket.mlInputTokens),
      },
      ...(input.usageDbu && input.usageDbu > 0 ? { usageDbu: input.usageDbu } : {}),
      ...(input.usageForecast ? { usageForecast: input.usageForecast } : {}),
    },
    forecast: {
      months: 12,
      annualGrowth: annualGrowthFromMonthly(input.monthlyGrowth),
      seasonality: "flat",
      customSeasonality: [...FLAT_SEASONALITY],
    },
  };
}

function probe(input: SimplePlanInput, dependencies: EstimateDependencies): UnitCosts {
  const basket: SimpleBasket = {
    etlNodes: PROBE_NODES,
    etlHoursPerDay: DAY_HOURS,
    sqlClusters: PROBE_SQL,
    mlInputTokens: PROBE_TOKENS,
  };
  const portfolio = portfolioShell(
    { ...input, commitDiscount: 0, monthlyGrowth: 0, monthlySpend: 0, mix: { etl: 1, sql: 1, ml: 1 }, basket },
    workloadsFromBasket(input, basket),
  );
  const result = estimate(portfolio, dependencies);
  const etl = line(result, "mix-etl");
  const sql = line(result, "mix-sql");
  const ml = line(result, "mix-ml");
  return {
    etlPerNode: etl.total / PROBE_NODES,
    etlDbuPerNode: etl.dbu / PROBE_NODES,
    sqlPerCluster: sql.total / PROBE_SQL,
    sqlDbuPerCluster: sql.dbu / PROBE_SQL,
    mlPerToken: ml.total / PROBE_TOKENS,
    mlDbuPerToken: ml.dbu / PROBE_TOKENS,
  };
}

function etlBasket(units: UnitCosts, etlSpend: number, sqlSpend: number, mlSpend: number): SimpleBasket {
  const etlNodes = units.etlPerNode > 0 ? etlSpend / units.etlPerNode : 0;
  const sqlClusters = units.sqlPerCluster > 0 ? sqlSpend / units.sqlPerCluster : 0;
  const mlInputTokens = units.mlPerToken > 0 ? mlSpend / units.mlPerToken : 0;
  return finalizeEtl({ etlNodes, sqlClusters, mlInputTokens });
}

function finalizeEtl(basket: { etlNodes: number; sqlClusters: number; mlInputTokens: number }): SimpleBasket {
  const nodes = Math.max(0, basket.etlNodes);
  if (nodes >= 1 || nodes === 0) {
    return {
      etlNodes: snap(nodes),
      etlHoursPerDay: nodes > 0 ? DAY_HOURS : 0,
      sqlClusters: snap(Math.max(0, basket.sqlClusters)),
      mlInputTokens: snap(Math.max(0, basket.mlInputTokens)),
    };
  }
  return {
    etlNodes: 1,
    etlHoursPerDay: snap(DAY_HOURS * nodes),
    sqlClusters: snap(Math.max(0, basket.sqlClusters)),
    mlInputTokens: snap(Math.max(0, basket.mlInputTokens)),
  };
}

function line(result: ReturnType<typeof estimate>, id: string) {
  return result.lines.find((item) => item.workloadId === id) ?? { total: 0, dbu: 0 };
}

function snap(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 1e6) / 1e6;
}
