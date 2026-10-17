import type { Portfolio } from "@cayfore/engine";

/** Older fitted plans have no calendar origin, so moving them requires a deliberate manual-growth fallback. */
export function planStartingIn(portfolio: Portfolio, startMonth: string) {
  const next = structuredClone(portfolio);
  next.forecast.startMonth = startMonth;
  let resetLegacyFit = false;
  if (next.simple?.usageForecast && !next.simple.usageForecast.originPeriod) {
    delete next.simple.usageForecast;
    resetLegacyFit = true;
  }
  if (next.usage?.forecast && !next.usage.forecast.originPeriod) {
    delete next.usage.forecast;
    resetLegacyFit = true;
  }
  return { portfolio: next, resetLegacyFit };
}
