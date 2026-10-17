import type { UnitCostEvidenceLevel, UnitCostRow } from "./types.js";

const levels: UnitCostEvidenceLevel[] = ["official", "derived", "estimate", "unresolved", "not_applicable"];

/** Row coverage is a count, never a sum of prices from incompatible units or alternative variants. */
export function summarizeUnitCostEvidence(rows: readonly UnitCostRow[]) {
  const counts = new Map<UnitCostEvidenceLevel, number>();
  for (const row of rows) counts.set(row.evidenceLevel, (counts.get(row.evidenceLevel) ?? 0) + 1);
  return {
    total: rows.length,
    buckets: levels.map((level) => ({
      level,
      count: counts.get(level) ?? 0,
      percent: rows.length ? ((counts.get(level) ?? 0) / rows.length) * 100 : 0,
    })),
  };
}
