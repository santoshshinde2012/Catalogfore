import { forecastOf } from "./forecast-fields.js";
import { isMonth } from "./forecast/calendar.js";
import { isRecord, num, str } from "./portfolio-fields.js";
import type { ImportedUsageSummary, PlanningEvent, Workload } from "./types.js";

export function normalizeEvents(value: unknown, workloads: Workload[]): PlanningEvent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const events = value.slice(0, 100).flatMap((event) => {
    if (!isRecord(event) || !isMonth(event.month)) return [];
    const workloadId = typeof event.workloadId === "string" ? event.workloadId : undefined;
    if (workloadId && !workloads.some((workload) => workload.id === workloadId)) return [];
    return [
      {
        id: str(event.id, `event-${event.month}`).slice(0, 80),
        name: str(event.name, "Usage change").slice(0, 120),
        month: event.month,
        usageMultiplier: num(event.usageMultiplier, 1, 0, 100),
        ...(workloadId ? { workloadId } : {}),
      },
    ];
  });
  return events.length ? events : undefined;
}

export function normalizeUsage(value: unknown): ImportedUsageSummary | undefined {
  if (!isRecord(value) || value.currency !== "USD" || !["system-billing", "focus"].includes(String(value.source)))
    return undefined;
  const coverage = isRecord(value.coverage) ? value.coverage : {};
  const observedMonths = Array.isArray(value.observedMonths)
    ? value.observedMonths
        .slice(0, 120)
        .flatMap((point) => {
          if (
            !isRecord(point) ||
            !isMonth(point.period) ||
            typeof point.amount !== "number" ||
            !Number.isFinite(point.amount)
          )
            return [];
          return [{ period: point.period, amount: point.amount }];
        })
        .sort((left, right) => left.period.localeCompare(right.period))
    : [];
  const fitted = forecastOf(value.forecast);
  const attribution = Array.isArray(value.attribution)
    ? value.attribution.slice(0, 1000).flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.key !== "string") return [];
        return [
          {
            key: entry.key.slice(0, 240),
            label: str(entry.label, entry.key).slice(0, 160),
            amount: num(entry.amount, 0, -1e15, 1e15),
            quantity: num(entry.quantity, 0, -1e15, 1e15),
            rows: num(entry.rows, 0, 0, 1e6),
            unpricedRows: num(entry.unpricedRows, 0, 0, 1e6),
          },
        ];
      })
    : undefined;
  return {
    source: value.source as ImportedUsageSummary["source"],
    selectedMonth: isMonth(value.selectedMonth) ? value.selectedMonth : null,
    costBasis: str(value.costBasis, "Published list prices").slice(0, 160),
    currency: "USD",
    observedMonths,
    observedUnit: value.observedUnit === "usd" ? "usd" : "dbu",
    coverage: {
      pricedRows: num(coverage.pricedRows, 0, 0, 1e6),
      unpricedRows: num(coverage.unpricedRows, 0, 0, 1e6),
      usedRows: num(coverage.usedRows, 0, 0, 1e6),
      skippedRows: num(coverage.skippedRows, 0, 0, 1e6),
    },
    warnings: Array.isArray(value.warnings)
      ? value.warnings
          .filter((warning): warning is string => typeof warning === "string")
          .slice(0, 100)
          .map((warning) => warning.slice(0, 1000))
      : [],
    ...(fitted ? { forecast: fitted } : {}),
    ...(typeof value.sourceFingerprint === "string"
      ? { sourceFingerprint: value.sourceFingerprint.slice(0, 120) }
      : {}),
    ...(typeof value.sourceLabel === "string" ? { sourceLabel: value.sourceLabel.slice(0, 120) } : {}),
    ...(attribution ? { attribution } : {}),
  };
}
