import { annualTotal, type Estimate, type ForecastPoint, type Portfolio } from "@dcf/engine";

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "forecast";
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
    ["monthly", csv(portfolio.name), "", "", estimate.dbu, estimate.dbuCost, estimate.cloudCost, estimate.total, csv(estimate.disclaimer)].join(","),
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
  doc.setFont("times", "bold");
  write(portfolio.name, 20, 22);
  doc.setFont("times", "normal");
  write(`${portfolio.cloud.toUpperCase()} · ${portfolio.region} · ${portfolio.tier}`);
  write(`Monthly ${usd(estimate.total)}  ·  DBU ${usd(estimate.dbuCost)}  ·  Cloud ${usd(estimate.cloudCost)}  ·  Add-on ${usd(estimate.addonCost)}`);
  write(`Next 12 months ${usd(annualTotal(points))}. Catalog ${estimate.catalogVersion}, verified ${estimate.verifiedOn}.`);
  write(estimate.disclaimer);
  write("Workloads");
  for (const line of estimate.lines) {
    write(`${line.name} (${line.sku}): ${usd(line.total)}  ·  ${line.dbu} DBU  ·  cloud ${usd(line.cloudCost)}`);
  }
  write("Forecast");
  for (const point of points) {
    write(`Month ${point.month}: ${usd(point.total)} (DBU ${usd(point.dbuCost)}, cloud ${usd(point.cloudCost)})`);
  }
  doc.save(`${slug(portfolio.name)}.pdf`);
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}
