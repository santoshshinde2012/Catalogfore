import {
  annualTotal,
  recommendations,
  uncertaintyBand,
  type Estimate,
  type ForecastPoint,
  type Portfolio,
} from "@cayfore/engine";

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

export function exportJson(portfolio: Portfolio, estimate: Estimate, points: ForecastPoint[]) {
  const payload = { portfolio, estimate, forecast: points, exportedAt: new Date().toISOString() };
  download(`${slug(portfolio.name)}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
}

export function exportCsv(portfolio: Portfolio, estimate: Estimate, points: ForecastPoint[]) {
  const lines = [
    ["section", "name", "sku", "hours", "dbu", "dbu_cost_usd", "cloud_cost_usd", "total_usd", "notes"].join(","),
    ...estimate.lines.map((line) =>
      [
        "workload",
        csv(line.name),
        line.sku,
        line.hours,
        line.dbu,
        line.dbuCost,
        line.cloudCost,
        line.total,
        csv(line.notes.join(" ")),
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
    ].join(","),
    ...points.map((point) =>
      ["forecast", `month_${point.month}`, "", "", "", point.dbuCost, point.cloudCost, point.total, ""].join(","),
    ),
  ];
  download(`${slug(portfolio.name)}.csv`, new Blob([lines.join("\n")], { type: "text/csv" }));
}

export async function exportPdf(portfolio: Portfolio, estimate: Estimate, points: ForecastPoint[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const width = doc.internal.pageSize.getWidth();
  let y = 48;
  const write = (text: string, size = 11, gap = 16) => {
    doc.setFontSize(size);
    const rows = doc.splitTextToSize(text, width - 72);
    if (y + rows.length * gap > 740) {
      doc.addPage();
      y = 48;
    }
    doc.text(rows, 36, y);
    y += rows.length * (size + 4) + 4;
  };
  const year = annualTotal(points);
  const monthBand = uncertaintyBand(estimate.total, portfolio, estimate);
  const yearBand = uncertaintyBand(year, portfolio, estimate);
  const ideas = recommendations(portfolio).slice(0, 4);
  doc.setFont("times", "bold");
  write("Cayfore", 12, 14);
  write(portfolio.name || "Untitled forecast", 20, 22);
  doc.setFont("times", "normal");
  write(`${portfolio.cloud.toUpperCase()} · ${portfolio.region} · ${portfolio.tier}`);
  write(
    `This month ${usd(estimate.total)} (about ${usd(monthBand.low)} to ${usd(monthBand.high)}). DBU ${usd(estimate.dbuCost)}. Cloud ${usd(estimate.cloudCost)}.`,
  );
  write(`First 12 months ${usd(yearBand.expected)} (about ${usd(yearBand.low)} to ${usd(yearBand.high)}).`);
  if (portfolio.budgetAnnual && portfolio.budgetAnnual > 0) {
    const gap = year - portfolio.budgetAnnual;
    write(
      gap > 0
        ? `${usd(gap)} over a ${usd(portfolio.budgetAnnual)} annual budget.`
        : `${usd(portfolio.budgetAnnual - year)} under a ${usd(portfolio.budgetAnnual)} annual budget.`,
    );
  }
  write(estimate.disclaimer);
  if (ideas.length) {
    write("Changes that save money");
    for (const idea of ideas) write(`${idea.title}: ${usd(idea.annualSavings)} over the first year. ${idea.detail}`);
  }
  write("Why");
  for (const line of estimate.lines) {
    write(`${line.name}: ${usd(line.total)}. ${line.notes[0] ?? ""}`);
  }
  const last = points[points.length - 1];
  if (last)
    write(
      `Horizon ${points.length} months. Last month ${usd(last.total)}. Catalog ${estimate.catalogVersion}, verified ${estimate.verifiedOn}.`,
    );
  doc.save(`${slug(portfolio.name)}.pdf`);
}

/** Exporters the page can offer. A new format is a new entry. */
export const forecastExporters = [
  { id: "json", write: exportJson },
  { id: "csv", write: exportCsv },
  { id: "pdf", write: exportPdf },
] as const;

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}
