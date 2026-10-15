import { lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

export const foundationModelStrategy = defineStrategy("foundation_model", (workload, context) => {
  const model = context.catalog.foundationModels.find((row) => row.id === workload.modelId);
  const dbu = model
    ? (Math.max(0, workload.inputTokensPerMonth) / 1_000_000) * model.inputDbuPerMillion +
      (Math.max(0, workload.outputTokensPerMonth) / 1_000_000) * model.outputDbuPerMillion +
      Math.max(0, workload.provisionedHoursPerMonth) * model.provisionedDbuPerHour
    : 0;
  const base = lineShell(workload);
  if (!model) base.notes.push("Unknown foundation model.");
  else
    base.notes.push(
      "Token DBUs use the model-serving list rate. Cache reads and regional processing uplifts are not included.",
    );
  return {
    ...base,
    sku: "model_serving",
    hours: workload.provisionedHoursPerMonth,
    dbu,
    dbuCost: priceDbu(dbu, context, "model_serving"),
    cloudCost: 0,
  };
});
