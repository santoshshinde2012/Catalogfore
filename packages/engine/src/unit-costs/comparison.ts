import { unitCostQuote } from "./quote.js";
import type { UnitCostRow } from "./types.js";

export interface UnitCostComparison {
  state: "available" | "insufficient" | "unavailable";
  reason: string | null;
  unit: string;
  unitQuantity: number;
  points: { row: UnitCostRow; barPercent: number; isSelected: boolean }[];
  unpricedRows: UnitCostRow[];
}

const identityFields = [
  "productId",
  "partId",
  "componentId",
  "cloud",
  "tier",
  "sku",
  "variant",
  "modelId",
  "instanceId",
  "unit",
  "unitQuantity",
] as const;
const dimensions = (row: UnitCostRow) =>
  JSON.stringify(
    Object.entries(row.dimensions)
      .filter(([key]) => key !== "aliases")
      .sort(([a], [b]) => a.localeCompare(b)),
  );

/** Compare alternative regional quotes only for the same configured component and billing basis. */
export function buildUnitCostComparison(rows: readonly UnitCostRow[], selected: UnitCostRow): UnitCostComparison {
  const result: UnitCostComparison = {
    state: "unavailable",
    reason: null,
    unit: selected.unit,
    unitQuantity: selected.unitQuantity,
    points: [],
    unpricedRows: [],
  };
  const quote = unitCostQuote(selected);
  if (quote.rate === null) return { ...result, reason: quote.reason };
  if (!selected.cloud || !selected.region)
    return {
      ...result,
      state: "insufficient",
      reason: "This row has no specific cloud and region to compare. Select a regional monetary component.",
    };
  const selectedDimensions = dimensions(selected);
  const matches = rows.filter(
    (row) =>
      row.region &&
      identityFields.every((field) => row[field] === selected[field]) &&
      dimensions(row) === selectedDimensions,
  );
  const unique = new Map<string, UnitCostRow>();
  for (const row of matches) {
    // More than one row for a supposedly identical regional scope is ambiguous, not a second alternative.
    if (unique.has(row.region!))
      return {
        ...result,
        reason:
          "Multiple quotes exist for the same regional scope; comparison is withheld until the ambiguity is resolved.",
      };
    unique.set(row.region!, row);
  }
  const priced = [...unique.values()]
    .filter((row) => unitCostQuote(row).rate !== null)
    .sort(
      (a, b) =>
        a.unitPriceUsd! - b.unitPriceUsd! || (a.regionLabel ?? a.region!).localeCompare(b.regionLabel ?? b.region!),
    );
  result.unpricedRows = [...unique.values()].filter((row) => unitCostQuote(row).rate === null);
  const maximum = Math.max(0, ...priced.map((row) => row.unitPriceUsd!));
  result.points = priced.map((row) => ({
    row,
    barPercent: maximum === 0 ? 0 : (row.unitPriceUsd! / maximum) * 100,
    isSelected: row.id === selected.id,
  }));
  result.state = priced.length > 1 ? "available" : "insufficient";
  result.reason =
    result.state === "available"
      ? null
      : "Only one resolved regional quote matches this exact configuration and billing basis.";
  return result;
}
