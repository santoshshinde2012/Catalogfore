import evidence from "../../../../data/unit-cost-evidence.json";
import type { UnitCostRow } from "./types.js";
import { sourceReference, withEvidenceLevel } from "./provenance.js";

export const unitCostReviewedOn = evidence.reviewedOn;

interface Applicability {
  productIds?: string[];
  modelIds?: string[];
  componentIds?: string[];
}
export function applyEvidence(rows: UnitCostRow[]): UnitCostRow[] {
  return rows.map((row) => {
    const notes = [...row.notes];
    const sources = [...row.sources];
    let conflict = false;
    for (const caveat of evidence.caveats) {
      const scope: Applicability = caveat.appliesTo;
      if (!Object.keys(scope).length) continue; // Shared limitations belong in the catalog disclaimer.
      if (scope.productIds && !scope.productIds.includes(row.productId)) continue;
      if (scope.modelIds && !scope.modelIds.includes(row.modelId ?? "")) continue;
      if (scope.componentIds && !scope.componentIds.includes(row.componentId)) continue;
      notes.push(caveat.message);
      conflict ||= caveat.status === "source-conflict";
      for (const id of caveat.sourceIds) {
        const reference = evidence.sources.find((item) => item.id === id)!;
        sources.push(
          sourceReference(reference.title, reference.url, reference.role === "consumption" ? "consumption" : "context"),
        );
      }
    }
    const uniqueSources = sources.filter(
      (reference, index, all) =>
        all.findIndex(
          (item) => item.url === reference.url && item.role === reference.role && item.locator === reference.locator,
        ) === index,
    );
    if (!conflict) return withEvidenceLevel({ ...row, notes: [...new Set(notes)], sources: uniqueSources });
    return withEvidenceLevel({
      ...row,
      status: "unpriced",
      confidence: "conflict",
      unitPriceUsd: null,
      usdPerUnit: null,
      baseRateUsd: null,
      baseRateUnit: null,
      dbuPerUnit: null,
      value: null,
      notes: [...new Set(notes)],
      sources: uniqueSources,
    });
  });
}

export const unitCostScope = `${evidence.scope} ${evidence.caveats
  .filter((item) => !Object.keys(item.appliesTo).length)
  .map((item) => item.message)
  .join(" ")}`;
