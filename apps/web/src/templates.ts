import { skuCatalog, uid, type Portfolio, type Workload } from "@dcf/engine";

export type MenuKind =
  | "jobs"
  | "all_purpose"
  | "dlt"
  | "serverless_jobs"
  | "serverless_notebooks"
  | "serverless_dlt"
  | "sql"
  | "serving"
  | "foundation"
  | "search"
  | "app"
  | "lakebase"
  | "storage"
  | "egress"
  | "metered";

export const MENU: { group: string; kind: MenuKind; label: string; blurb: string }[] = [
  { group: "Compute", kind: "jobs", label: "Jobs cluster", blurb: "Scheduled work on your VMs" },
  { group: "Compute", kind: "all_purpose", label: "All-purpose cluster", blurb: "Notebooks and exploration" },
  { group: "Compute", kind: "dlt", label: "Lakeflow pipeline", blurb: "Classic Core, Pro, or Advanced" },
  { group: "Compute", kind: "serverless_jobs", label: "Serverless jobs", blurb: "DBUs only, compute included" },
  { group: "Compute", kind: "serverless_notebooks", label: "Serverless notebooks", blurb: "Interactive, no VM bill" },
  { group: "Compute", kind: "serverless_dlt", label: "Serverless pipeline", blurb: "Declarative pipelines, managed" },
  { group: "SQL & data", kind: "sql", label: "SQL warehouse", blurb: "Classic, Pro, or serverless" },
  { group: "SQL & data", kind: "storage", label: "Storage", blurb: "DSU or object store" },
  { group: "SQL & data", kind: "egress", label: "Egress", blurb: "A single $/GB assumption" },
  { group: "AI", kind: "serving", label: "Model serving", blurb: "CPU concurrency or a GPU" },
  { group: "AI", kind: "foundation", label: "Foundation model API", blurb: "Tokens or provisioned hours" },
  { group: "AI", kind: "search", label: "AI Search", blurb: "Vector endpoint units" },
  { group: "Apps", kind: "app", label: "Databricks App", blurb: "Medium or large capacity" },
  { group: "Apps", kind: "lakebase", label: "Lakebase", blurb: "CU-hours plus storage" },
  { group: "Other", kind: "metered", label: "Other DBU meter", blurb: "Connect, training, managed services" },
];

export function createWorkload(kind: MenuKind): Workload {
  const id = uid();
  const day = { hoursPerDay: 8, daysPerWeek: 5 };
  switch (kind) {
    case "jobs":
      return {
        id,
        name: "Jobs cluster",
        kind: "cluster",
        sku: "jobs_classic",
        instanceId: "m5.xlarge",
        scale: { min: 2, max: 4, utilization: 0.6 },
        photon: false,
        spotShare: 0,
        spotDiscount: skuCatalog.defaultSpotDiscount,
        schedule: day,
      };
    case "all_purpose":
      return {
        id,
        name: "Interactive cluster",
        kind: "cluster",
        sku: "all_purpose_classic",
        instanceId: "m5.xlarge",
        scale: { min: 1, max: 1, utilization: 1 },
        photon: false,
        spotShare: 0,
        spotDiscount: skuCatalog.defaultSpotDiscount,
        schedule: { hoursPerDay: 6, daysPerWeek: 5 },
      };
    case "dlt":
      return {
        id,
        name: "Pipeline",
        kind: "cluster",
        sku: "dlt_pro",
        instanceId: "i3.xlarge",
        scale: { min: 2, max: 4, utilization: 0.75 },
        photon: true,
        spotShare: 0,
        spotDiscount: skuCatalog.defaultSpotDiscount,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      };
    case "serverless_jobs":
      return {
        id,
        name: "Serverless jobs",
        kind: "serverless_compute",
        sku: "jobs_serverless",
        dbuPerHour: 8,
        schedule: day,
      };
    case "serverless_notebooks":
      return {
        id,
        name: "Serverless notebooks",
        kind: "serverless_compute",
        sku: "all_purpose_serverless",
        dbuPerHour: 4,
        schedule: { hoursPerDay: 6, daysPerWeek: 5 },
      };
    case "serverless_dlt":
      return {
        id,
        name: "Serverless pipeline",
        kind: "serverless_compute",
        sku: "dlt_serverless",
        dbuPerHour: 12,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      };
    case "sql":
      return {
        id,
        name: "SQL warehouse",
        kind: "sql",
        edition: "serverless",
        size: "s",
        scale: { min: 1, max: 2, utilization: 0.45 },
        schedule: { hoursPerDay: 8, daysPerWeek: 5 },
      };
    case "serving":
      return {
        id,
        name: "Serving endpoint",
        kind: "model_serving",
        mode: "cpu",
        concurrency: 2,
        gpuId: "t4",
        replicas: 1,
        schedule: { hoursPerDay: 12, daysPerWeek: 7 },
      };
    case "foundation":
      return {
        id,
        name: "Foundation model",
        kind: "foundation_model",
        modelId: "llama-3.1-8b",
        inputTokensPerMonth: 5_000_000,
        outputTokensPerMonth: 1_000_000,
        provisionedHoursPerMonth: 0,
      };
    case "search":
      return {
        id,
        name: "AI Search",
        kind: "ai_search",
        variant: "standard",
        units: 1,
        storageGb: 20,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      };
    case "app":
      return { id, name: "Databricks App", kind: "app", size: "medium", schedule: { hoursPerDay: 10, daysPerWeek: 5 } };
    case "lakebase":
      return {
        id,
        name: "Lakebase",
        kind: "lakebase",
        cu: 2,
        storageGb: 50,
        schedule: { hoursPerDay: 16, daysPerWeek: 7 },
      };
    case "storage":
      return { id, name: "Managed storage", kind: "storage", gbMonth: 500, managed: true };
    case "egress":
      return { id, name: "Egress", kind: "egress", gbMonth: 200 };
    case "metered":
      return { id, name: "Predictive optimization", kind: "metered", sku: "managed_services", dbuPerMonth: 200 };
  }
}

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
