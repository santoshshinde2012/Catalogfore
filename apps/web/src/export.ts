import { pdfPlain, recommendations, type Estimate, type ForecastPoint, type Portfolio } from "@cayfore/engine";
import type { LucideIcon } from "lucide-react";
import { FileJson2, FileSpreadsheet, FileText } from "lucide-react";

import { exportResult, forecastCsv, forecastJson, type ForecastExportResult } from "./export-data";
import { APP_NAME } from "./site";

export type ForecastDownload = {
  id: string;
  menuLabel: string;
  detail: string;
  icon: LucideIcon;
  busyLabel?: string;
  failure?: string;
  write: (
    portfolio: Portfolio,
    estimate: Estimate,
    points: ForecastPoint[],
    result?: ForecastExportResult,
  ) => Promise<void> | void;
};

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "forecast"
  );
}

export function exportJson(
  portfolio: Portfolio,
  estimate: Estimate,
  points: ForecastPoint[],
  result?: ForecastExportResult,
) {
  const canonical = exportResult(portfolio, estimate, points, result);
  download(`${slug(portfolio.name)}.json`, new Blob([forecastJson(canonical)], { type: "application/json" }));
}

export async function exportXlsx(
  portfolio: Portfolio,
  estimate: Estimate,
  points: ForecastPoint[],
  result?: ForecastExportResult,
) {
  const { buildForecastWorkbook, forecastWorkbookName } = await import("@cayfore/sheet");
  const canonical = exportResult(portfolio, estimate, points, result);
  const bytes = await buildForecastWorkbook(canonical);
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);
  download(
    forecastWorkbookName(canonical.portfolio.cloud),
    new Blob([body], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
}

export function exportCsv(
  portfolio: Portfolio,
  estimate: Estimate,
  points: ForecastPoint[],
  result?: ForecastExportResult,
) {
  const canonical = exportResult(portfolio, estimate, points, result);
  download(`${slug(portfolio.name)}.csv`, new Blob([forecastCsv(canonical)], { type: "text/csv" }));
}

export async function exportPdf(
  portfolioInput: Portfolio,
  estimateInput: Estimate,
  pointsInput: ForecastPoint[],
  result?: ForecastExportResult,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const width = doc.internal.pageSize.getWidth();
  let y = 48;
  const write = (text: string, size = 11, gap = 16) => {
    doc.setFontSize(size);
    const rows = doc.splitTextToSize(pdfPlain(text), width - 72);
    if (y + rows.length * gap > 740) {
      doc.addPage();
      y = 48;
    }
    doc.text(rows, 36, y);
    y += rows.length * (size + 4) + 4;
  };
  const canonical = exportResult(portfolioInput, estimateInput, pointsInput, result);
  const { portfolio, estimate, points } = canonical;
  const year = canonical.annual;
  const first = canonical.months[0];
  const monthBand = first
    ? { low: first.low, expected: first.expected, high: first.high }
    : { low: 0, expected: 0, high: 0 };
  const yearBand = canonical.band;
  const ideas = recommendations(portfolio).slice(0, 4);
  doc.setFont("times", "bold");
  write(APP_NAME, 12, 14);
  write(portfolio.name || "Untitled forecast", 20, 22);
  doc.setFont("times", "normal");
  write(`${portfolio.cloud.toUpperCase()} · ${portfolio.region} · ${portfolio.tier}`);
  write(
    `First forecast month ${usd(monthBand.expected)} (about ${usd(monthBand.low)} to ${usd(monthBand.high)}). DBU ${usd(points[0]?.dbuCost ?? 0)}. Cloud ${usd(points[0]?.cloudCost ?? 0)}.`,
  );
  write(`First 12 months ${usd(yearBand.expected)} (about ${usd(yearBand.low)} to ${usd(yearBand.high)}).`);
  if (portfolio.budgetAnnual != null) {
    const gap = year - portfolio.budgetAnnual;
    write(
      gap > 0
        ? `${usd(gap)} over a ${usd(portfolio.budgetAnnual)} annual budget.`
        : `${usd(portfolio.budgetAnnual - year)} under a ${usd(portfolio.budgetAnnual)} annual budget.`,
    );
  }
  write(estimate.disclaimer);
  write("Assumptions");
  for (const assumption of canonical.assumptions) write(assumption);
  write("Monthly forecast (USD)");
  for (const month of canonical.months)
    write(`Month ${month.month}: ${usd(month.expected)} (${usd(month.low)} to ${usd(month.high)}).`);
  if (ideas.length) {
    write("Independent alternatives (do not add these savings together)");
    for (const idea of ideas) write(`${idea.title}: ${usd(idea.annualSavings)} over the first year. ${idea.detail}`);
  }
  write("Baseline workload costs");
  for (const line of estimate.lines) {
    write(`${line.name}: ${usd(line.total)}. ${line.notes[0] ?? ""}`);
  }
  const last = points[points.length - 1];
  if (last)
    write(
      `Horizon ${points.length} months. Last month ${usd(last.total)}. Catalog ${estimate.catalogVersion}, dated ${estimate.verifiedOn}.`,
    );
  doc.save(`${slug(portfolio.name)}.pdf`);
}

/** Exporters the page can offer. A new format is a new entry. The menu does not name them. */
export const forecastExporters: readonly ForecastDownload[] = [
  {
    id: "xlsx",
    menuLabel: "XLSX",
    detail: "Excel workbook with formulas, rates, and sources",
    icon: FileSpreadsheet,
    busyLabel: "Preparing Excel…",
    failure: "The Excel file did not download. Try again, or use CSV.",
    write: exportXlsx,
  },
  {
    id: "csv",
    menuLabel: "CSV",
    detail: "Costs and monthly forecasts for spreadsheets",
    icon: FileSpreadsheet,
    write: exportCsv,
  },
  {
    id: "json",
    menuLabel: "JSON",
    detail: "Complete forecast data and assumptions. Save your forecast; reopen with Menu → Open forecast.",
    icon: FileJson2,
    write: exportJson,
  },
  {
    id: "pdf",
    menuLabel: "PDF",
    detail: "Shareable report with costs and assumptions",
    icon: FileText,
    busyLabel: "Preparing PDF…",
    failure: "The PDF did not download. Try again, or use CSV.",
    write: exportPdf,
  },
];

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}
