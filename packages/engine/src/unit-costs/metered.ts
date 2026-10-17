import {
  AZURE_COMPONENT_SCOPE,
  azureReferenceComponent,
  componentMatchesPlacement,
  FIXED_CONSUMPTION,
  PARSE_DBU_PER_PAGE,
  SERVING_DBU_PER_LAUNCH,
} from "../rates/components.js";
import { skuCatalog } from "../catalog.js";
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

import { zerobusRows } from "./ingestion.js";
import { genieConditions } from "./promotions.js";

export function meteredRows(context: RowContext, workload: Extract<Workload, { kind: "metered" }>) {
  const formula = formulaFor(workload);
  if (formula === "zerobus_gb") return zerobusRows(context);
  const reference = azureReferenceComponent(context.product.id);
  if (reference) {
    azureOnly(context, reference);
    return;
  }
  const fixed = FIXED_CONSUMPTION[context.product.id];
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
    for (const [variant, dbu] of Object.entries(PARSE_DBU_PER_PAGE)) {
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
        formula: `Launches × ${SERVING_DBU_PER_LAUNCH} DBU/launch × USD/DBU`,
      },
      SERVING_DBU_PER_LAUNCH,
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

function azureOnly(context: RowContext, reference: NonNullable<ReturnType<typeof azureReferenceComponent>>) {
  const { componentId, name: componentName, unit, usdPerUnit: rate } = reference;
  for (const cloud of CLOUDS) {
    const regions = cloud === "azure" ? skuCatalog.regions.filter((region) => region.cloud === cloud) : [null];
    for (const region of regions)
      for (const tier of TIERS) {
        const exact = region !== null && componentMatchesPlacement(cloud, region.id);
        monetary(context, {
          componentId,
          componentName,
          cloud,
          tier,
          unit,
          region: region?.id ?? null,
          regionLabel: region?.label ?? null,
          sourceRegion: cloud === "azure" ? AZURE_COMPONENT_SCOPE.region : null,
          unitPriceUsd: exact ? rate : null,
          dbuPerUnit: unit === "DBU" ? 1 : null,
          status: exact ? "priced" : "unpriced",
          confidence: exact ? "measured" : "unpublished",
          formula: `${unit} quantity × USD/${unit}`,
          notes: [
            "Only the Azure East US observation is stored; no rate is inferred for other clouds or regions.",
            ...(!exact
              ? [
                  `This ${region?.label ?? cloud.toUpperCase()} placement has no matching public unit quote; the East US reference is not applied.`,
                ]
              : []),
          ],
          sources: [
            source(
              "Azure Retail Prices API; exact East US component observation",
              AZURE_COMPONENT_SCOPE.sourceUrl,
              "price",
              `East US; meterName ${reference.meterName}; USD/${unit}; commercial Consumption; Enterprise aliases Premium`,
              cloud === "azure" ? AZURE_COMPONENT_SCOPE.observedOn : null,
            ),
          ],
        });
      }
  }
}
