import type { Product } from "@cayfore/catalog";
import { roundMoney } from "../money.js";
import { AZURE_DATA_PROCESSED_USD_PER_GB, TOKENS_PER_MILLION, ZEROBUS_USD_PER_GB } from "../rates/published.js";
import type { Workload } from "../types.js";
import { GENIE_FREE_DBU_PER_USER, geniePromoFactor, genieUserUsageFree } from "./genie-window.js";

const PARSE_DBU_PER_PAGE: Record<string, number> = {
  simple: 12.5,
  caption: 22.5,
  medium: 62.5,
  high: 87.5,
};

type Metered = Extract<Workload, { kind: "metered" }>;
type FormulaId = NonNullable<Product["formula"]>;

/** One conversion from catalog inputs to a metered workload. A new formula is a new entry. */
export type ProductFormula = (workload: Metered) => Workload;

function numInput(inputs: Workload["inputs"], key: string): number {
  const value = inputs?.[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function dbu(workload: Metered, sku: Metered["sku"], amount: number): Workload {
  return { ...workload, sku, dbuPerMonth: amount };
}

/**
 * Named catalog formulas. `estimate()` does not import this module.
 * Each function returns a new workload and does not mutate the input.
 */
export const formulaRegistry: Record<FormulaId, ProductFormula> = {
  genie_code: (workload) => {
    const users = numInput(workload.inputs, "users");
    const each = numInput(workload.inputs, "dbuPerUser");
    const billed = Math.max(0, users * each - users * GENIE_FREE_DBU_PER_USER) * geniePromoFactor();
    return dbu(workload, "model_serving", billed);
  },
  genie_llm_free: (workload) => {
    const users = numInput(workload.inputs, "users");
    const each = numInput(workload.inputs, "dbuPerUser");
    const billed = genieUserUsageFree() ? 0 : Math.max(0, users * each - users * GENIE_FREE_DBU_PER_USER);
    return dbu(workload, "model_serving", billed);
  },
  genie_sql: (workload) =>
    dbu(
      workload,
      "sql_serverless",
      numInput(workload.inputs, "users") *
        numInput(workload.inputs, "questionsPerUser") *
        numInput(workload.inputs, "sqlDbuPerQuestion"),
    ),
  dashboard_sql: (workload) =>
    dbu(
      workload,
      "sql_serverless",
      numInput(workload.inputs, "viewers") *
        numInput(workload.inputs, "refreshes") *
        numInput(workload.inputs, "sqlDbuPerRefresh"),
    ),
  ai_parse: (workload) => {
    const band = PARSE_DBU_PER_PAGE[String(workload.inputs?.complexity ?? "simple")] ?? PARSE_DBU_PER_PAGE.simple;
    return dbu(workload, "model_serving", numInput(workload.inputs, "pages") * band);
  },
  custom_fm: (workload) =>
    dbu(
      workload,
      "model_serving",
      (numInput(workload.inputs, "inputTokens") / TOKENS_PER_MILLION) *
        numInput(workload.inputs, "inputDbuPerMillion") +
        (numInput(workload.inputs, "outputTokens") / TOKENS_PER_MILLION) *
          numInput(workload.inputs, "outputDbuPerMillion"),
    ),
  launch: (workload) => dbu(workload, "model_serving", numInput(workload.inputs, "launches")),
  azure_data_processed: (workload) => ({
    ...workload,
    sku: "managed_services",
    dbuPerMonth: 0,
    fixedUsdByCloud: { azure: roundMoney(numInput(workload.inputs, "gb") * AZURE_DATA_PROCESSED_USD_PER_GB) },
  }),
  zerobus_gb: (workload) => ({
    ...workload,
    sku: "managed_services",
    dbuPerMonth: 0,
    units: numInput(workload.inputs, "gb"),
    rateByPlacement: ZEROBUS_USD_PER_GB,
  }),
};

/** Apply the formula registered for this id. */
export function applyProductFormula(workload: Metered, formula: FormulaId): Workload {
  return formulaRegistry[formula](workload);
}
