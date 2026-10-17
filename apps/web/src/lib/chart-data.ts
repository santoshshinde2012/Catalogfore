import type { ForecastPoint, SimpleMonth } from "@cayfore/engine";

export interface HistoryPoint {
  period: string;
  amount: number;
}
export interface ChartRow {
  period: string;
  label: string;
  actual?: number;
  expected?: number;
  comparison?: number;
  budget?: number;
  band?: [number, number];
  dbuCost?: number;
  cloudCost?: number;
  addonCost?: number;
}
export interface ChartSeries {
  months: SimpleMonth[];
  startMonth: string;
  history?: HistoryPoint[];
  budgetAnnual?: number;
  comparison?: { months: SimpleMonth[]; startMonth: string; name: string };
}

export function periodAt(start: string, offset: number): string {
  const [year, month] = start.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function periodLabel(period: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(`${period}-01T00:00:00Z`),
  );
}
export function monthlyRows(series: ChartSeries): ChartRow[] {
  const rows = new Map<string, ChartRow>();
  const ensure = (period: string) => {
    const row = rows.get(period) ?? { period, label: periodLabel(period) };
    rows.set(period, row);
    return row;
  };
  for (const point of (series.history ?? []).filter((point) => point.period < series.startMonth).slice(-12)) {
    ensure(point.period).actual = point.amount;
  }
  for (const month of series.months.slice(0, 12)) {
    const row = ensure(periodAt(series.startMonth, month.month - 1));
    row.expected = month.expected;
    row.band = [month.low, month.high];
    if (series.budgetAnnual != null) row.budget = series.budgetAnnual / 12;
  }
  if (series.comparison) {
    for (const month of series.comparison.months.slice(0, 12)) {
      ensure(periodAt(series.comparison.startMonth, month.month - 1)).comparison = month.expected;
    }
  }
  return [...rows.values()].sort((a, b) => a.period.localeCompare(b.period));
}
export function cumulativeRows(series: ChartSeries): ChartRow[] {
  let total = 0;
  let low = 0;
  let high = 0;
  let compared = 0;
  const comparison = series.comparison;
  return series.months.slice(0, 12).map((month, index) => {
    total += month.expected;
    low += month.low;
    high += month.high;
    const period = periodAt(series.startMonth, index);
    const matched = comparison?.months.find((point) => periodAt(comparison.startMonth, point.month - 1) === period);
    compared += matched?.expected ?? 0;
    return {
      period,
      label: periodLabel(period),
      expected: cents(total),
      band: [cents(low), cents(high)],
      ...(series.budgetAnnual != null ? { budget: cents((series.budgetAnnual * (index + 1)) / 12) } : {}),
      ...(matched ? { comparison: cents(compared) } : {}),
    };
  });
}
export function compositionRows(points: ForecastPoint[], startMonth: string): ChartRow[] {
  return points.slice(0, 12).map((point) => {
    const period = periodAt(startMonth, point.month - 1);
    return { ...point, expected: point.total, period, label: periodLabel(period) };
  });
}
export function budgetPosition(months: SimpleMonth[], annualBudget: number) {
  let cumulative = 0;
  let firstOver: number | null = null;
  for (const month of months.slice(0, 12)) {
    cumulative += month.expected;
    if (firstOver == null && cents(cumulative) > cents((annualBudget * month.month) / 12)) firstOver = month.month;
  }
  return { forecast: cents(cumulative), delta: cents(cumulative - annualBudget), firstOver };
}
export function axisMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${Math.round(value / 100_000) / 10}m`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${Math.round(value)}`;
}
const cents = (value: number) => Math.round(value * 100) / 100;
