/** Hours in a modeled month: 52 weeks / 12 months. */
export const MONTH_WEEKS = 52 / 12;

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function hoursPerMonth(hoursPerDay: number, daysPerWeek: number): number {
  return Math.max(0, hoursPerDay) * clamp(daysPerWeek, 0, 7) * MONTH_WEEKS;
}

export function scaledCount(min: number, max: number, utilization: number): number {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.max(0, Math.max(min, max));
  return lo + (hi - lo) * clamp(utilization, 0, 1);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** US dollar text. Matches the page: whole dollars from $1,000 up, cents below that. */
export function formatUsd(value: number, digits?: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const fraction = digits ?? (Math.abs(safe) >= 1000 ? 0 : 2);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(safe);
}
