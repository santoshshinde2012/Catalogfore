import {
  neutralizeSpreadsheetFormula,
  projectPortfolio,
  type Estimate,
  type ForecastPoint,
  type Portfolio,
} from "@cayfore/engine";

export type ForecastExportResult = ReturnType<typeof projectPortfolio>;

/** All formats consume the same calculated result as the screen. */
export function exportResult(
  portfolio: Portfolio,
  _estimate: Estimate,
  _points: ForecastPoint[],
  result?: ForecastExportResult,
): ForecastExportResult {
  return result ?? projectPortfolio(portfolio);
}

export function forecastJson(result: ForecastExportResult, exportedAt = new Date().toISOString()): string {
  return JSON.stringify(
    {
      format: "cayfore.forecast",
      version: 1,
      portfolio: result.portfolio,
      estimate: result.estimate,
      forecast: result.points,
      months: result.months,
      annual: result.annual,
      band: result.band,
      assumptions: result.assumptions,
      exportedAt,
    },
    null,
    2,
  );
}

export function forecastCsv(result: ForecastExportResult): string {
  const { portfolio, estimate, points, months } = result;
  const lines = [
    [
      "section",
      "name",
      "sku",
      "hours",
      "dbu",
      "dbu_cost_usd",
      "cloud_cost_usd",
      "total_usd",
      "notes",
      "low_usd",
      "high_usd",
    ].join(","),
    ...estimate.lines.map((line) =>
      [
        "workload",
        csv(line.name),
        csv(line.sku),
        line.hours,
        line.dbu,
        line.dbuCost,
        line.cloudCost,
        line.total,
        csv(line.notes.join(" ")),
        "",
        "",
      ].join(","),
    ),
    [
      "monthly",
      csv(portfolio.name),
      "",
      "",
      estimate.dbu,
      estimate.dbuCost,
      estimate.cloudCost,
      estimate.total,
      csv(estimate.disclaimer),
      "",
      "",
    ].join(","),
    ...points.map((point, index) =>
      [
        "forecast",
        `month_${point.month}`,
        "",
        "",
        "",
        point.dbuCost,
        point.cloudCost,
        point.total,
        "",
        months[index]?.low ?? "",
        months[index]?.high ?? "",
      ].join(","),
    ),
    [
      "annual",
      csv(portfolio.name),
      "",
      "",
      "",
      "",
      "",
      result.annual,
      csv(result.band.reasons.join(" ")),
      result.band.low,
      result.band.high,
    ].join(","),
    ...(portfolio.budgetAnnual != null
      ? [["budget", "annual_budget", "", "", "", "", "", portfolio.budgetAnnual, "", "", ""].join(",")]
      : []),
  ];
  return lines.join("\n");
}

function csv(value: string): string {
  return `"${neutralizeSpreadsheetFormula(value).replace(/"/g, '""')}"`;
}
