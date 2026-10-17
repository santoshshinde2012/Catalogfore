import type { LineItem, RateProvenance } from "./types.js";

export function isNetImportedRate(provenance: RateProvenance | undefined): boolean {
  return provenance?.kind === "imported" && (provenance.basis === "effective" || provenance.basis === "billed");
}

export function addonEligibleCost(lines: LineItem[]): number {
  return lines.reduce((sum, line) => sum + (isNetImportedRate(line.rateProvenance) ? 0 : line.dbuCost), 0);
}
