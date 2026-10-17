import { AZURE_DATA_PROCESSED_USD_PER_GB, ZEROBUS_USD_PER_GB } from "../rates/published.js";
import { formulaFor } from "../products.js";
import type { Workload } from "../types.js";
import {
  append,
  CLOUDS,
  consumptionSource,
  converted,
  dbuComponent,
  monetary,
  pricingSource,
  source,
  TIERS,
  type RowContext,
} from "./context.js";

import { genieConditions } from "./promotions.js";

const fixedConversions: Record<string, { dbu: number; unit: string; basis?: number }> = {
  ai_gateway_tables: { dbu: 7.143, unit: "GB" },
  ai_gateway_tracking: { dbu: 1.429, unit: "GB" },
  ai_search_reranker: { dbu: 28.571, unit: "request", basis: 1000 },
  shutterstock: { dbu: 0.857, unit: "image" },
};

export function meteredRows(context: RowContext, workload: Extract<Workload, { kind: "metered" }>) {
  const formula = formulaFor(workload);
  if (formula === "zerobus_gb") {
    for (const cloud of CLOUDS)
      for (const tier of TIERS) {
        const rate = ZEROBUS_USD_PER_GB[cloud]?.[tier] ?? null;
        monetary(context, {
          componentId: "ingestion",
          componentName: "Zerobus ingestion",
          cloud,
          tier,
          region: cloud === "aws" ? "us-east-1" : cloud === "azure" ? "eastus" : null,
          regionLabel: cloud === "aws" ? "US East" : cloud === "azure" ? "East US" : null,
          sourceRegion: cloud === "aws" ? "us-east-1" : cloud === "azure" ? "eastus" : null,
          unit: "GB",
          unitPriceUsd: rate,
          status: rate === null ? "unpriced" : "approximate",
          confidence: rate === null ? "unpublished" : "secondary",
          formula: "Ingested GB × reference USD/GB; no region factor",
          includesCompute: true,
          sources: [source(context.product.source.title, context.product.source.url, "price")],
          notes: ["Reference-region snapshot; no price is inferred for another region or unsupported cloud."],
        });
      }
    return;
  }
  if (formula === "azure_data_processed") {
    azureOnly(context, "networking", "Data Processed", "GB", AZURE_DATA_PROCESSED_USD_PER_GB);
    return;
  }
  if (context.product.id === "jobs_light") {
    azureOnly(context, "dbu", "Jobs Light usage", "DBU", 0.22);
    return;
  }
  if (context.product.id === "clean_rooms") {
    azureOnly(context, "collaborator", "Clean Rooms collaborator", "collaborator-day", 50);
    return;
  }
  const fixed = fixedConversions[context.product.id];
  if (fixed) {
    converted(
      context,
      workload.sku,
      {
        componentId: "usage",
        componentName: context.product.menuLabel,
        unit: fixed.unit,
        unitQuantity: fixed.basis ?? 1,
        formula: `${fixed.unit} quantity / ${fixed.basis ?? 1} × ${fixed.dbu} DBU × USD/DBU`,
        notes: ["The catalog's example monthly DBU quantity is not used as a unit rate."],
      },
      fixed.dbu,
    );
    return;
  }
  if (formula === "ai_parse") {
    for (const [variant, dbu] of Object.entries({ simple: 12.5, caption: 22.5, medium: 62.5, high: 87.5 })) {
      converted(
        context,
        workload.sku,
        {
          componentId: "parsing",
          componentName: "Document parsing",
          variant,
          unit: "page",
          formula: `Pages × ${dbu} estimated midpoint DBU/page × USD/DBU`,
          status: "approximate",
          confidence: "assumption",
          notes: [
            "Estimated midpoint of a complexity band, not a guaranteed per-page tariff. Actual document complexity changes metered DBUs.",
          ],
        },
        dbu,
      );
    }
    return;
  }
  if (formula === "launch") {
    converted(
      context,
      workload.sku,
      {
        componentId: "launch",
        componentName: "Serving launch charge",
        unit: "launch",
        confidence: "assumption",
        status: "approximate",
        sources: [source(context.product.source.title, context.product.source.url, "consumption")],
        formula: "Launches × 1 DBU/launch × USD/DBU",
      },
      1,
    );
    return;
  }
  dbuComponent(context, workload.sku);
  const usageMultiplier =
    context.product.id === "data_quality" ? 2 : context.product.id === "data_classification" ? 3 : null;
  if (usageMultiplier !== null)
    append(context, {
      componentId: "consumption_multiplier",
      componentName: "Underlying consumption multiplier",
      unit: "multiplier",
      rateKind: "multiplier",
      value: usageMultiplier,
      status: "approximate",
      confidence: "cited",
      formula: `Raw underlying automated-serverless DBU × ${usageMultiplier}`,
      sources: [consumptionSource],
      notes: [
        "Apply once to raw underlying usage. System billing DBUs and the forecast's editable DBU quantity already include this multiplier.",
      ],
    });
  if (formula === "genie_code" || formula === "genie_llm_free") genieConditions(context, formula);
  if (formula === "genie_sql" || formula === "dashboard_sql")
    append(context, {
      componentId: "usage_assumption",
      componentName: "SQL usage per question or refresh",
      unit: formula === "genie_sql" ? "question" : "refresh",
      rateKind: "consumption",
      status: "unpriced",
      confidence: "assumption",
      formula: "Measure warehouse DBUs / questions or refreshes; a universal conversion is not published",
      notes: ["Example defaults are editable usage assumptions. Only the separate SQL DBU rate has a unit price."],
      sources: [pricingSource],
    });
  if (context.product.id === "ai_forecast")
    append(context, {
      componentId: "forecast_multiplier",
      componentName: "Forecasting consumption factor",
      unit: "multiplier",
      rateKind: "multiplier",
      value: 4,
      status: "approximate",
      confidence: "cited",
      formula: "Underlying training usage × 4 consumption factor",
      sources: [consumptionSource],
      notes: ["Apply to underlying consumption once; already metered billing DBUs include the multiplier."],
    });
}

function azureOnly(context: RowContext, componentId: string, componentName: string, unit: string, rate: number) {
  for (const cloud of CLOUDS)
    for (const tier of TIERS)
      monetary(context, {
        componentId,
        componentName,
        cloud,
        tier,
        unit,
        region: cloud === "azure" ? "eastus" : null,
        regionLabel: cloud === "azure" ? "East US" : null,
        sourceRegion: cloud === "azure" ? "eastus" : null,
        unitPriceUsd: cloud === "azure" ? rate : null,
        dbuPerUnit: unit === "DBU" ? 1 : null,
        status: cloud === "azure" ? "priced" : "unpriced",
        confidence: cloud === "azure" ? "measured" : "unpublished",
        formula: `${unit} quantity × USD/${unit}`,
        notes: ["Only the Azure East US observation is stored; no rate is inferred for other clouds or regions."],
        sources: [source(context.product.source.title, context.product.source.url, "price")],
      });
}
