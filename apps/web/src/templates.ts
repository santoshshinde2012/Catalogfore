import { createWorkload, type Portfolio, type Workload } from "@cayfore/engine";

export { createWorkload };

function shell(name: string, workloads: Workload[]): Portfolio {
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

export function smallAnalyticsTeam(): Portfolio {
  const jobs = createWorkload("jobs");
  const notebooks = createWorkload("all_purpose");
  const sql = createWorkload("sql");
  const storage = createWorkload("storage");
  const egress = createWorkload("egress");
  if (jobs.kind === "cluster") {
    jobs.name = "Nightly transforms";
    jobs.scale = { min: 2, max: 2, utilization: 1 };
    jobs.schedule = { hoursPerDay: 3, daysPerWeek: 7 };
    jobs.instanceId = "m5.xlarge";
  }
  if (notebooks.kind === "cluster") {
    notebooks.name = "Analyst notebooks";
    notebooks.schedule = { hoursPerDay: 6, daysPerWeek: 5 };
  }
  if (sql.kind === "sql") {
    sql.name = "BI warehouse";
    sql.size = "s";
    sql.schedule = { hoursPerDay: 6, daysPerWeek: 5 };
  }
  if (storage.kind === "storage") storage.gbMonth = 400;
  if (egress.kind === "egress") egress.gbMonth = 80;
  const portfolio = shell("Small analytics team", [jobs, notebooks, sql, storage, egress]);
  portfolio.forecast.months = 24;
  portfolio.forecast.annualGrowth = 0.06;
  return portfolio;
}

export function mlPlatform(): Portfolio {
  const train = createWorkload("jobs");
  const notebooks = createWorkload("all_purpose");
  const serve = createWorkload("serving");
  const model = createWorkload("foundation");
  const storage = createWorkload("storage");
  if (train.kind === "cluster") {
    train.name = "Training jobs";
    train.instanceId = "g4dn.xlarge";
    train.scale = { min: 1, max: 4, utilization: 0.5 };
    train.spotShare = 0.7;
    train.schedule = { hoursPerDay: 8, daysPerWeek: 5 };
  }
  if (notebooks.kind === "cluster") {
    notebooks.name = "Research notebooks";
    notebooks.instanceId = "r5d.xlarge";
    notebooks.schedule = { hoursPerDay: 5, daysPerWeek: 5 };
  }
  if (serve.kind === "model_serving") {
    serve.name = "Feature endpoint";
    serve.mode = "gpu";
    serve.gpuId = "t4";
    serve.replicas = 1;
    serve.schedule = { hoursPerDay: 14, daysPerWeek: 7 };
  }
  if (model.kind === "foundation_model") {
    model.name = "Llama 3.1 8B";
    model.inputTokensPerMonth = 20_000_000;
    model.outputTokensPerMonth = 4_000_000;
  }
  if (storage.kind === "storage") storage.gbMonth = 2000;
  const portfolio = shell("ML platform", [train, notebooks, serve, model, storage]);
  portfolio.forecast.annualGrowth = 0.15;
  portfolio.forecast.months = 36;
  return portfolio;
}

export function streamingEtl(): Portfolio {
  const pipe = createWorkload("dlt");
  const orch = createWorkload("serverless_jobs");
  const storage = createWorkload("storage");
  const egress = createWorkload("egress");
  if (pipe.kind === "cluster") {
    pipe.name = "CDC pipeline";
    pipe.sku = "dlt_advanced";
    pipe.instanceId = "i3.xlarge";
    pipe.photon = true;
    pipe.scale = { min: 2, max: 6, utilization: 0.7 };
  }
  if (orch.kind === "serverless_compute") {
    orch.name = "Housekeeping jobs";
    orch.dbuPerHour = 3;
    orch.schedule = { hoursPerDay: 2, daysPerWeek: 7 };
  }
  if (storage.kind === "storage") {
    storage.name = "Landing zone";
    storage.managed = false;
    storage.gbMonth = 8000;
  }
  if (egress.kind === "egress") egress.gbMonth = 1500;
  const portfolio = shell("Streaming ETL", [pipe, orch, storage, egress]);
  portfolio.forecast.seasonality = "retail";
  portfolio.forecast.annualGrowth = 0.1;
  portfolio.forecast.months = 24;
  return portfolio;
}

export function nextYear(): Portfolio {
  const portfolio = smallAnalyticsTeam();
  portfolio.name = "What will my team cost next year?";
  portfolio.forecast.months = 12;
  portfolio.forecast.annualGrowth = 0.08;
  return portfolio;
}

export function spendReview(): Portfolio {
  const notebooks = createWorkload("all_purpose");
  const jobs = createWorkload("jobs");
  const sql = createWorkload("sql");
  const storage = createWorkload("storage");
  if (notebooks.kind === "cluster") {
    notebooks.name = "Shared notebooks";
    notebooks.schedule = { hoursPerDay: 14, daysPerWeek: 5 };
    notebooks.scale = { min: 2, max: 2, utilization: 1 };
    notebooks.spotShare = 0;
  }
  if (jobs.kind === "cluster") {
    jobs.name = "Fat transforms";
    jobs.instanceId = "m5.xlarge";
    jobs.scale = { min: 6, max: 6, utilization: 1 };
    jobs.photon = false;
    jobs.spotShare = 0;
    jobs.schedule = { hoursPerDay: 8, daysPerWeek: 5 };
  }
  if (sql.kind === "sql") {
    sql.name = "Pinned warehouse";
    sql.edition = "classic";
    sql.size = "m";
    sql.scale = { min: 1, max: 1, utilization: 1 };
    sql.schedule = { hoursPerDay: 24, daysPerWeek: 7 };
  }
  if (storage.kind === "storage") storage.gbMonth = 2000;
  const portfolio = shell("Where can we cut spend?", [notebooks, jobs, sql, storage]);
  portfolio.forecast.months = 12;
  portfolio.forecast.annualGrowth = 0;
  return portfolio;
}

export function classicChoice(): Portfolio {
  const jobs = createWorkload("jobs");
  if (jobs.kind === "cluster") {
    jobs.name = "Nightly batch";
    jobs.instanceId = "m5.xlarge";
    jobs.scale = { min: 4, max: 4, utilization: 1 };
    jobs.photon = false;
    jobs.spotShare = 0;
    jobs.schedule = { hoursPerDay: 4, daysPerWeek: 7 };
  }
  const portfolio = shell("Classic or serverless for this job?", [jobs]);
  portfolio.forecast.months = 12;
  portfolio.forecast.annualGrowth = 0;
  return portfolio;
}

export function singleJob(): Portfolio {
  const jobs = createWorkload("jobs");
  if (jobs.kind === "cluster") {
    jobs.name = "Nightly";
    jobs.instanceId = "m5.xlarge";
    jobs.scale = { min: 2, max: 2, utilization: 1 };
    jobs.photon = false;
    jobs.spotShare = 0;
    jobs.schedule = { hoursPerDay: 8, daysPerWeek: 5 };
  }
  const portfolio = shell("What does this one job cost?", [jobs]);
  portfolio.forecast.months = 12;
  portfolio.forecast.annualGrowth = 0;
  return portfolio;
}

export const TEMPLATES = [
  {
    id: "analytics",
    name: "Small analytics team",
    blurb: "A nightly job, weekday notebooks, and a serverless SQL warehouse.",
    build: smallAnalyticsTeam,
  },
  {
    id: "ml",
    name: "ML platform",
    blurb: "Spot GPU training, a serving endpoint, and a foundation-model API.",
    build: mlPlatform,
  },
  {
    id: "etl",
    name: "Streaming ETL",
    blurb: "An always-on Photon pipeline, housekeeping, and a fat landing zone.",
    build: streamingEtl,
  },
];
