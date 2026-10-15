import { aiSearchStrategy } from "./ai-search.js";
import { appStrategy } from "./app.js";
import { clusterStrategy } from "./cluster.js";
import { egressStrategy } from "./egress.js";
import { foundationModelStrategy } from "./foundation-model.js";
import { lakebaseStrategy } from "./lakebase.js";
import { meteredStrategy } from "./metered.js";
import { modelServingStrategy } from "./model-serving.js";
import { serverlessComputeStrategy } from "./serverless-compute.js";
import { sqlStrategy } from "./sql.js";
import { storageStrategy } from "./storage.js";
import type { CostStrategy } from "../types.js";

/** Default book of strategies. Callers can pass a different list without editing the estimator. */
export const defaultCostStrategies: readonly CostStrategy[] = [
  clusterStrategy,
  serverlessComputeStrategy,
  sqlStrategy,
  modelServingStrategy,
  foundationModelStrategy,
  aiSearchStrategy,
  appStrategy,
  lakebaseStrategy,
  storageStrategy,
  egressStrategy,
  meteredStrategy,
];
