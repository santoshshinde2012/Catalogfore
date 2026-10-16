import { roundMoney } from "./money.js";
import type { Estimate, Portfolio } from "./types.js";
import type { UncertaintyBand } from "./recommend.js";

export function uncertaintyFactors(
  portfolio: Portfolio,
  result: Estimate,
): { low: number; high: number; calibrated: boolean; reasons: string[] } {
  const calibrated = Math.abs(portfolio.usageScale - 1) > 0.0001 || portfolio.usageCalibrated === true;
  const approximateVm = result.lines.some((line) => line.approximateVm);
  const low = calibrated ? 0.95 : 0.85;
  let high = calibrated ? 1.06 : 1.2;
  const reasons: string[] = [];
  if (calibrated) {
    reasons.push(
      "Month-zero DBUs are scaled to an imported usage file, so this band is tighter. Virtual machines still move with that factor because the usage table has no VM bill.",
    );
  } else {
    reasons.push("No usage file yet. Treat this as about 15% under to 20% over the point estimate.");
  }
  if (!calibrated && approximateVm) {
    high = 1.28;
    reasons.push(
      "A VM line is a reference-region stand-in or the SQL warehouse equivalence. The high side is wider until you replace that rate.",
    );
  }
  return { low, high, calibrated, reasons };
}

export function uncertaintyBand(amount: number, portfolio: Portfolio, result: Estimate): UncertaintyBand {
  const safe = Number.isFinite(amount) ? amount : 0;
  const factors = uncertaintyFactors(portfolio, result);
  return {
    low: roundMoney(safe * factors.low),
    expected: roundMoney(safe),
    high: roundMoney(safe * factors.high),
    calibrated: factors.calibrated,
    reasons: factors.reasons,
  };
}
