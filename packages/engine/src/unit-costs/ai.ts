import { skuCatalog } from "../catalog.js";
import type { Workload } from "../types.js";
import { append, converted, monetary, source, type RowContext } from "./context.js";
import { SERVING_DBU_PER_CONCURRENT_REQUEST_HOUR, PROVISIONED_MODEL_UNITS_PER_BLOCK } from "../rates/components.js";

export function aiRows(context: RowContext, workload: Workload): boolean {
  if (workload.kind === "model_serving") {
    const profiles =
      workload.mode === "cpu"
        ? [{ id: "cpu", label: "CPU concurrent request", dbuPerHour: SERVING_DBU_PER_CONCURRENT_REQUEST_HOUR }]
        : skuCatalog.servingGpuDbuPerHour;
    for (const profile of profiles)
      converted(
        context,
        "model_serving",
        {
          componentId: "compute",
          componentName: "Model serving compute",
          variant: profile.id,
          unit: workload.mode === "cpu" ? "concurrent-request-hour" : "replica-hour",
          formula: "Serving hours × concurrency or replicas × profile DBU/hour × USD/DBU",
          dimensions: { profile: profile.label, mode: workload.mode },
          notes: ["Consumption profile is a curated snapshot. Model-specific limits and networking are separate."],
        },
        profile.dbuPerHour,
      );
    return true;
  }
  if (workload.kind === "foundation_model") {
    const pinned = Boolean(context.product.patch.modelId) && context.product.id !== "foundation_provisioned";
    const models = skuCatalog.foundationModels.filter((model) => !pinned || model.id === workload.modelId);
    for (const model of models) {
      if (context.product.id !== "foundation_provisioned") {
        converted(
          context,
          "model_serving",
          {
            componentId: "input",
            componentName: "Input tokens",
            modelId: model.id,
            unit: "token",
            unitQuantity: 1_000_000,
            formula: "Input tokens / 1,000,000 × input DBU per million × USD/DBU",
            dimensions: { model: model.label, direction: "input" },
          },
          model.inputDbuPerMillion,
        );
        if (model.outputDbuPerMillion > 0)
          converted(
            context,
            "model_serving",
            {
              componentId: "output",
              componentName: "Output tokens",
              modelId: model.id,
              unit: "token",
              unitQuantity: 1_000_000,
              formula: "Output tokens / 1,000,000 × output DBU per million × USD/DBU",
              dimensions: { model: model.label, direction: "output" },
            },
            model.outputDbuPerMillion,
          );
      }
      converted(
        context,
        "model_serving",
        {
          componentId: "provisioned",
          componentName: "Provisioned model throughput",
          modelId: model.id,
          unit: `${PROVISIONED_MODEL_UNITS_PER_BLOCK}-model-unit-hour`,
          formula: "Provisioned block-hours × DBU per block-hour × USD/DBU",
          dimensions: { model: model.label, modelUnitsPerBlock: PROVISIONED_MODEL_UNITS_PER_BLOCK },
          notes: [
            `One block-hour is ${PROVISIONED_MODEL_UNITS_PER_BLOCK} model units for one hour. Sum deployed blocks × hours before calculating; throughput depends on the model and request shape.`,
            "Token usage and provisioned capacity are separate pricing modes; do not add both unless both are billed.",
          ],
          sources: [
            source(
              "Foundation model serving pricing and capacity basis",
              "https://www.databricks.com/product/pricing/foundation-model-serving",
              "consumption",
            ),
          ],
        },
        model.provisionedDbuPerHour,
      );
    }
    return true;
  }
  if (workload.kind === "ai_search") {
    const variants =
      context.product.id === "agent_bricks" ? (["standard", "storage_optimized"] as const) : [workload.variant];
    for (const variant of variants) {
      const spec = skuCatalog.aiSearch[variant];
      converted(
        context,
        "ai_search",
        {
          componentId: "compute",
          componentName: "AI Search endpoint compute",
          variant,
          unit: "search-unit-hour",
          formula: "Search unit-hours × endpoint DBU/unit-hour × USD/DBU",
          sources: [
            source(
              "AI Search published US East pricing",
              "https://www.databricks.com/product/pricing/ai-search",
              "consumption",
            ),
          ],
        },
        spec.dbuPerHour,
      );
      monetary(context, {
        componentId: "storage",
        componentName: "AI Search index storage",
        variant,
        unit: "GB-month",
        unitPriceUsd: spec.storagePerGbMonth,
        formula: `max(0, stored GB − ${spec.freeGb} included GB) × curated USD/GB-month`,
        notes: ["Curated flat assumption, not a fresh regional storage tariff. Azure DSU conversion can differ."],
        conditions: spec.freeGb > 0 ? [`Only index storage above ${spec.freeGb} GB is billable.`] : [],
        sources: [source("AI Search pricing", "https://www.databricks.com/product/pricing/ai-search", "context")],
      });
      if (spec.freeGb > 0)
        append(context, {
          componentId: "storage_allowance",
          componentName: "Included index storage",
          variant,
          unit: "GB",
          value: spec.freeGb,
          rateKind: "allowance",
          status: "conditional",
          confidence: "assumption",
          formula: `Subtract ${spec.freeGb} GB before computing storage charges`,
          conditions: ["Applies to this endpoint variant; compute charges remain separate."],
          sources: [
            source("AI Search included storage", "https://www.databricks.com/product/pricing/ai-search", "context"),
          ],
        });
    }
    return true;
  }
  return false;
}
