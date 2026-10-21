import type { UnitCostRow, UnitCostSource } from "./types.js";

export interface UnitCostCalculation {
  status: "calculated" | "invalid_quantity" | "unavailable" | "overflow";
  quantity: number;
  unit: string;
  unitRateUsd: number | null;
  totalUsd: number | null;
  reason: string | null;
}

/** A quote and its normalized rate must agree before either can drive a calculation or chart. */
export function unitCostQuote(
  row: Pick<UnitCostRow, "rateKind" | "status" | "confidence" | "unitQuantity" | "unitPriceUsd" | "usdPerUnit">,
): { rate: number | null; reason: string | null } {
  if (row.rateKind !== "money" || ["unpriced", "not_applicable"].includes(row.status) || row.confidence === "conflict")
    return { rate: null, reason: "This component has no resolved monetary quote for the selected scope." };
  if (!Number.isFinite(row.unitQuantity) || row.unitQuantity <= 0)
    return { rate: null, reason: "The quoted billing quantity is invalid." };
  if (row.unitPriceUsd === null || !Number.isFinite(row.unitPriceUsd) || row.unitPriceUsd < 0)
    return { rate: null, reason: "A valid non-negative source price is not recorded." };
  const rate = row.unitPriceUsd / row.unitQuantity;
  if (
    row.usdPerUnit === null ||
    !Number.isFinite(row.usdPerUnit) ||
    !Number.isFinite(rate) ||
    (rate === 0 && row.unitPriceUsd > 0) ||
    !sameValue(row.usdPerUnit, rate)
  )
    return { rate: null, reason: "The quoted price and normalized unit price disagree; calculation is withheld." };
  return { rate, reason: null };
}

export function calculateUnitCost(row: UnitCostRow, quantity: number): UnitCostCalculation {
  const { rate, reason } = unitCostQuote(row);
  const result = { quantity, unit: row.unit, unitRateUsd: rate, totalUsd: null };
  if (rate === null) return { ...result, status: "unavailable", reason };
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1e15)
    return {
      ...result,
      status: "invalid_quantity",
      reason: "Enter a finite billable quantity from 0 to 1,000,000,000,000,000.",
    };
  const totalUsd = quantity * rate;
  if (!Number.isFinite(totalUsd) || (quantity > 0 && rate > 0 && totalUsd === 0))
    return { ...result, status: "overflow", reason: "This quantity and price exceed the supported numeric range." };
  return { ...result, status: "calculated", totalUsd, reason: null };
}

export interface UnitCostStep {
  id: string;
  label: string;
  kind: "money" | "quantity" | "multiplier";
  value: number;
  unit: string;
  sources: UnitCostSource[];
}
export interface UnitCostBreakdown {
  available: boolean;
  reason: string | null;
  unit: string;
  unitQuantity: number;
  unitPriceUsd: number | null;
  usdPerUnit: number | null;
  dbuPerQuote: number | null;
  steps: UnitCostStep[];
  explanation: string;
}

/** Display the stored conversion only when its factors reproduce the canonical quoted amount. */
export function buildUnitCostBreakdown(row: UnitCostRow): UnitCostBreakdown {
  const { rate, reason } = unitCostQuote(row);
  const dbuPerQuote = row.dbuPerUnit === null ? null : row.dbuPerUnit * row.unitQuantity;
  const result: UnitCostBreakdown = {
    available: rate !== null,
    reason,
    unit: row.unit,
    unitQuantity: row.unitQuantity,
    unitPriceUsd: rate === null ? null : row.unitPriceUsd,
    usdPerUnit: rate,
    dbuPerQuote: dbuPerQuote !== null && Number.isFinite(dbuPerQuote) ? dbuPerQuote : null,
    steps: [],
    explanation: "The stored quote is the component price; no additional conversion is inferred.",
  };
  if (rate === null) return { ...result, explanation: reason! };
  const byRole = (role: UnitCostSource["role"]) => row.sources.filter((source) => source.role === role);
  const factor = row.regionFactor ?? 1;
  if (
    row.baseRateUnit === "DBU" &&
    row.baseRateUsd !== null &&
    Number.isFinite(row.baseRateUsd) &&
    row.baseRateUsd >= 0 &&
    result.dbuPerQuote !== null &&
    result.dbuPerQuote >= 0 &&
    Number.isFinite(factor) &&
    factor > 0 &&
    sameValue(row.baseRateUsd * result.dbuPerQuote * factor, row.unitPriceUsd!)
  ) {
    result.steps.push(
      {
        id: "base",
        label: "Source price",
        kind: "money",
        value: row.baseRateUsd,
        unit: "USD / DBU",
        sources: byRole("price"),
      },
      {
        id: "consumption",
        label: "Consumption for quoted quantity",
        kind: "quantity",
        value: result.dbuPerQuote,
        unit: "DBU",
        sources: byRole("consumption"),
      },
    );
    if (row.regionFactor !== null)
      result.steps.push({
        id: "region",
        label: "Regional price factor",
        kind: "multiplier",
        value: factor,
        unit: "×",
        sources: byRole("region"),
      });
    result.explanation =
      "Source USD/DBU × consumption for the quoted quantity × regional factor = component quote. Evidence labels and exclusions still apply.";
  } else if (row.baseRateUsd !== null || row.dbuPerUnit !== null) {
    result.explanation =
      "The stored component quote is available, but a complete matching factor breakdown is not established. Review the formula and evidence; no missing factor is inferred.";
  }
  result.steps.push({
    id: "result",
    label: "Component quote",
    kind: "money",
    value: row.unitPriceUsd!,
    unit: `USD / ${row.unitQuantity} ${row.unit}`,
    sources: byRole("price"),
  });
  return result;
}

function sameValue(a: number, b: number): boolean {
  return a === b || Math.abs(a - b) <= Number.EPSILON * 16 * Math.max(Math.abs(a), Math.abs(b));
}
