import { clamp } from "../money.js";

export function annualGrowthFromMonthly(monthly: number): number {
  const rate = clamp(Number.isFinite(monthly) ? monthly : 0, -0.2, 0.2);
  return Math.pow(1 + rate, 12) - 1;
}
