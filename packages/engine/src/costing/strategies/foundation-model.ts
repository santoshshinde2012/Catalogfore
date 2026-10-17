import { lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";
import { componentPriceConflict } from "../../rates/component-evidence.js";
import { TOKENS_PER_MILLION } from "../../rates/published.js";

export const foundationModelStrategy = defineStrategy("foundation_model", (workload, context) => {
  const model = context.catalog.foundationModels.find((row) => row.id === workload.modelId);
  const conflict =
    workload.provisionedHoursPerMonth > 0
      ? componentPriceConflict({ modelId: workload.modelId, componentId: "provisioned" })
      : null;
  const dbu = model
    ? (Math.max(0, workload.inputTokensPerMonth) / TOKENS_PER_MILLION) * model.inputDbuPerMillion +
      (Math.max(0, workload.outputTokensPerMonth) / TOKENS_PER_MILLION) * model.outputDbuPerMillion +
      (conflict ? 0 : Math.max(0, workload.provisionedHoursPerMonth) * model.provisionedDbuPerHour)
    : 0;
  const base = lineShell(workload);
  if (conflict) base.notes.push(`Unpriced provisioned capacity: ${conflict.message}`);
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
