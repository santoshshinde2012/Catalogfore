import { createWorkload, type Portfolio } from "@cayfore/engine";
import { portfolioShell as shell } from "./template-shell";

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
