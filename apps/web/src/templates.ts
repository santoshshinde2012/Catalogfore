import { createWorkload, type Portfolio } from "@cayfore/engine";
import { portfolioShell as shell } from "./template-shell";
import { mlPlatform, streamingEtl } from "./template-builds";

export { mlPlatform, streamingEtl };

export { createWorkload };

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
