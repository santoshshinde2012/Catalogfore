import { roundMoney } from "./money.js";
import type { Estimate, ForecastPoint, ForecastSettings } from "./types.js";

export const FLAT_SEASONALITY = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

/** January–December. Mean is above 1; forecasts divide by the mean so a flat year still matches the run-rate. */
export const RETAIL_SEASONALITY = [0.85, 0.8, 0.9, 0.95, 1, 1, 1.05, 1.05, 1.1, 1.15, 1.35, 1.2];

export function seasonalityVector(settings: ForecastSettings): number[] {
  if (settings.seasonality === "retail") return RETAIL_SEASONALITY;
  if (settings.seasonality === "custom" && settings.customSeasonality?.length === 12) {
    return settings.customSeasonality.map((value) => (Number.isFinite(value) && value > 0 ? value : 1));
  }
  return FLAT_SEASONALITY;
}

export function forecast(estimate: Estimate, settings: ForecastSettings): ForecastPoint[] {
  const seasons = seasonalityVector(settings);
  const mean = seasons.reduce((sum, value) => sum + value, 0) / seasons.length;
  const growth = Number.isFinite(settings.annualGrowth) ? settings.annualGrowth : 0;
  const points: ForecastPoint[] = [];
  for (let index = 0; index < settings.months; index += 1) {
    const factor = Math.pow(1 + growth, index / 12) * (seasons[index % 12] / mean);
    const dbuCost = roundMoney(estimate.dbuCost * factor);
    const cloudCost = roundMoney(estimate.cloudCost * factor);
    const addonCost = roundMoney(estimate.addonCost * factor);
    points.push({
      month: index + 1,
      dbuCost,
      cloudCost,
      addonCost,
      total: roundMoney(dbuCost + cloudCost + addonCost),
    });
  }
  return points;
}

export function annualTotal(points: ForecastPoint[]): number {
  return roundMoney(points.slice(0, 12).reduce((sum, point) => sum + point.total, 0));
}
