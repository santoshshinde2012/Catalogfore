import type ExcelJS from "exceljs";
import type { LineItem, PortfolioProjection } from "@cayfore/engine";
import confidenceFile from "../../../../data/rate-confidence.json";
import { listedRate } from "../listed-rate.js";
import { registerForecastSheet } from "../registry.js";
import { finishSheet, safeText } from "../style.js";

type CellScore = { cloud: string; region: string; tier: string; sku: string; score: number; band: string };
type ProductScore = { score: number; band: string };

const confidence = confidenceFile as {
  cells: CellScore[];
  products: Record<string, ProductScore>;
};

const HEADERS = ["SKU", "$/DBU", "Source", "Confidence", "Band", "Citation"];
const COLUMN_WIDTHS = [24, 12, 28, 14, 16, 72];
const MONEY_COLUMNS = [2];
const FIRST_DATA_ROW = 2;

function buildRates(workbook: ExcelJS.Workbook, result: PortfolioProjection): void {
  const sheet = workbook.addWorksheet("Rates");
  const scores = new Map(confidence.cells.map((cell) => [scoreKey(cell), cell]));
  sheet.addRow(HEADERS);
  const seen = new Set<string>();
  for (const line of result.estimate.lines) {
    if (seen.has(line.sku)) continue;
    seen.add(line.sku);
    const key = `${result.portfolio.cloud}|${result.portfolio.region}|${result.portfolio.tier}|${line.sku}`;
    const score = scores.get(key);
    const product = productScore(result, line);
    sheet.addRow([
      safeText(line.sku),
      listedRate(result, line),
      safeText(line.rateProvenance?.source ?? line.rateProvenance?.label ?? "Curated list"),
      score?.score ?? product?.score ?? "",
      safeText(score?.band ?? product?.band ?? ""),
      safeText(line.notes[0] ?? line.rateProvenance?.label ?? ""),
    ]);
  }
  finishSheet(sheet, {
    columns: HEADERS.length,
    widths: COLUMN_WIDTHS,
    firstRow: FIRST_DATA_ROW,
    lastRow: sheet.rowCount,
    money: MONEY_COLUMNS,
  });
}

function scoreKey(cell: CellScore): string {
  return `${cell.cloud}|${cell.region}|${cell.tier}|${cell.sku}`;
}

function productScore(result: PortfolioProjection, line: LineItem): ProductScore | undefined {
  const workload = result.portfolio.workloads.find((item) => item.id === line.workloadId);
  return workload?.productId ? confidence.products[workload.productId] : undefined;
}

registerForecastSheet({ id: "rates", name: "Rates", build: buildRates });
