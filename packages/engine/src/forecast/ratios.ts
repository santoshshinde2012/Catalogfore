import { monthIndex } from "./calendar.js";
import type { ForecastRatio, UsageForecast } from "./series.js";

export function forecastRatioAt(
  forecast: UsageForecast | undefined,
  period: string,
  legacyIndex: number,
): ForecastRatio | undefined {
  if (!forecast) return undefined;
  const index = forecast.originPeriod ? monthIndex(period) - monthIndex(forecast.originPeriod) : legacyIndex;
  return index >= 0 ? forecast.ratios[index] : undefined;
}
