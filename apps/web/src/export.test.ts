/** @vitest-environment jsdom */
import { Blob as NodeBlob } from "node:buffer";
import { defaultPlan, parseCsv, projectPortfolio, projectSimple } from "@cayfore/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exportCsv, exportJson, forecastExporters } from "./export";
import { forecastCsv, forecastJson } from "./export-data";

function fittedResult() {
  const portfolio = projectSimple(defaultPlan()).portfolio;
  if (!portfolio.simple) throw new Error("fixture requires quick metadata");
  portfolio.simple.usageForecast = {
    method: "log-linear",
    mape: null,
    holdout: 0,
    monthlyGrowth: 0.02,
    ratios: Array.from({ length: 12 }, (_, index) => ({
      low: 0.9 + index * 0.01,
      expected: 1.02 ** (index + 1),
      high: 1.2 + index * 0.03,
    })),
  };
  portfolio.budgetAnnual = 200000;
  return projectPortfolio(portfolio);
}

afterEach(() => vi.restoreAllMocks());

describe("canonical forecast exports", () => {
  it("reconciles fitted chart months, points, annual, intervals, CSV and JSON to cents", () => {
    const result = fittedResult();
    const json = JSON.parse(forecastJson(result)) as {
      forecast: { total: number }[];
      annual: number;
      months: { expected: number }[];
      band: { low: number; high: number };
    };
    expect(json.forecast.map((point) => point.total)).toEqual(result.months.map((month) => month.expected));
    expect(json.annual).toBe(result.annual);
    expect(json.band).toEqual(result.band);
    const rows = parseCsv(forecastCsv(result));
    const values = rows.filter((row) => row.section === "forecast").map((row) => Number(row.total_usd));
    expect(values).toEqual(result.months.map((month) => month.expected));
    expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(result.annual, 2);
    expect(rows.find((row) => row.section === "annual")?.total_usd).toBe(String(result.annual));
    expect(rows.filter((row) => row.section === "forecast").map((row) => Number(row.low_usd))).toEqual(
      result.months.map((month) => month.low),
    );
  });

  it("downloads the same actual CSV and JSON payloads and labels them for reopening", async () => {
    const result = fittedResult();
    const blobs: Blob[] = [];
    vi.stubGlobal("Blob", NodeBlob);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: (blob: Blob) => {
        blobs.push(blob);
        return "blob:test";
      },
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      exportJson(result.portfolio, result.estimate, [], result);
      exportCsv(result.portfolio, result.estimate, [], result);
      const json = JSON.parse(await blobs[0].text()) as { format: string; annual: number };
      expect(json.format).toBe("cayfore.forecast");
      expect(json.annual).toBe(result.annual);
      expect(await blobs[1].text()).toBe(forecastCsv(result));
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("neutralizes formula-like user labels in CSV", () => {
    const result = fittedResult();
    result.portfolio.name = "=IMPORTDATA(1)";
    result.estimate.lines[0].name = "+SUM(A1)";
    expect(forecastCsv(result)).toContain("'=IMPORTDATA(1)");
    expect(forecastCsv(result)).toContain("'+SUM(A1)");
  });
});

describe("forecast exporter registry", () => {
  it("gives every download the same contract", () => {
    expect(forecastExporters.map((exporter) => exporter.id)).toEqual(["xlsx", "csv", "json", "pdf"]);
    const ids = new Set(forecastExporters.map((exporter) => exporter.id));
    expect(ids.size).toBe(forecastExporters.length);
    for (const exporter of forecastExporters) {
      expect(exporter.menuLabel.length).toBeGreaterThan(0);
      expect(exporter.detail.length).toBeGreaterThan(0);
      expect(typeof exporter.write).toBe("function");
      expect(exporter.icon).toBeTypeOf("object");
    }
  });
});
