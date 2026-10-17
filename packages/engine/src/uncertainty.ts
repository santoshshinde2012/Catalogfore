import { roundMoney } from "./money.js";
import type { Estimate, Portfolio } from "./types.js";
import type { UncertaintyBand } from "./recommend.js";

export function uncertaintyFactors(
  portfolio: Portfolio,
  result: Estimate,
): { low: number; high: number; calibrated: boolean; reasons: string[] } {
  const hasObservedRows = (portfolio.usage?.coverage.usedRows ?? 0) > 0;
  const calibrated = hasObservedRows
    ? result.lines.some((line) => line.priceStatus !== "unpriced" && (line.dbu !== 0 || line.total !== 0))
    : Math.abs(portfolio.usageScale - 1) > 0.0001 || portfolio.usageCalibrated === true;
  const approximateVm = result.lines.some((line) => line.approximateVm);
  const low = calibrated ? 0.95 : 0.85;
  let high = calibrated ? 1.06 : 1.2;
  const reasons: string[] = [];
  if (calibrated) {
    reasons.push(
      hasObservedRows
        ? "The known baseline uses imported costs or quantities. This narrower planning range describes that known subtotal; it is not a calibrated prediction interval. The imported baseline adds no inferred VM bill."
        : "Month-zero DBUs are scaled to an imported usage file, so this planning range is tighter. Virtual machines still move with that factor because the usage table has no VM bill.",
    );
  } else {
    reasons.push(
      hasObservedRows
        ? "The imported file does not establish a priced baseline. The planning range describes the known subtotal only."
        : "No usage file yet. Treat this as about 15% under to 20% over the point estimate.",
    );
  }
  if (approximateVm) {
    high = 1.28;
    reasons.push(
      "A VM line is a reference-region stand-in or the SQL warehouse equivalence. The high side is wider until you replace that rate.",
    );
  }
  if (result.coverage?.unpricedLines)
    reasons.push("Unpriced workloads are excluded from this range. Their missing costs can exceed its high value.");
  if (result.total < 0)
    reasons.push(
      "This baseline is a net credit. Forecasting it assumes those credits recur; select a representative consumption month if that is unintended.",
    );
  return { low, high, calibrated, reasons };
}

export function uncertaintyBand(amount: number, portfolio: Portfolio, result: Estimate): UncertaintyBand {
  const safe = Number.isFinite(amount) ? amount : 0;
  const factors = uncertaintyFactors(portfolio, result);
  return {
    low: roundMoney(Math.min(safe * factors.low, safe * factors.high)),
    expected: roundMoney(safe),
    high: roundMoney(Math.max(safe * factors.low, safe * factors.high)),
    calibrated: factors.calibrated,
    reasons: factors.reasons,
  };
}
