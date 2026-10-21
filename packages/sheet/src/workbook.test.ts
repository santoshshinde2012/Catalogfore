import { productCatalog } from "@cayfore/catalog";
import { defaultPlan, projectSimple } from "@cayfore/engine";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildForecastWorkbook, forecastWorkbookName } from "./workbook";

describe("forecast workbook", () => {
  it("writes branded sheets, live totals, and formula-safe text", async () => {
    const result = projectSimple(defaultPlan());
    const named = {
      ...result,
      portfolio: { ...result.portfolio, name: '=HYPERLINK("http://evil")' },
      assumptions: ["=cmd", ...result.assumptions],
    };
    const bytes = await buildForecastWorkbook(named, new Date("2026-10-17T00:00:00Z"));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as never);
    expect(forecastWorkbookName("aws", new Date("2026-10-17T00:00:00Z"))).toBe(
      "catalogfore-forecast-aws-2026-10-17.xlsx",
    );
    expect(workbook.creator).toBe("Catalogfore");
    expect(workbook.description).toMatch(/Not affiliated with Databricks/);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Monthly forecast",
      "Summary",
      "Breakdown",
      "Products",
      "Savings",
      "Rates",
    ]);

    const summary = workbook.getWorksheet("Summary")!;
    expect(summary.getCell("A1").value).toBe("Catalogfore");
    expect(summary.getCell("A1").font?.bold).toBe(true);
    expect(summary.getCell("A1").fill).toMatchObject({ fgColor: { argb: "FFFF3621" } });
    expect(summary.getCell("B3").value).toBe("AWS");
    expect(summary.getCell("B9").value).toMatchObject({ formula: "'Monthly forecast'!C14" });
    expect(summary.getCell("B12").value).toBe(productCatalog.version);
    expect(String(summary.getCell("B15").value)).toMatch(/Not affiliated with Databricks/);
    expect(String(summary.getCell("B17").value)).toMatch(/^'=cmd|^'=HYPERLINK|'=cmd|'=/);

    const monthly = workbook.getWorksheet("Monthly forecast")!;
    expect(monthly.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(monthly.getCell("C2").value).toBe(result.months[0].expected);
    expect(monthly.getCell("F2").value).toMatchObject({ formula: "SUM($C$2:C2)" });
    expect(monthly.getCell("C14").value).toMatchObject({ formula: "SUM(C2:C13)" });
    expect(monthly.getColumn(3).numFmt).toBe('"$"#,##0.00');
    expect(monthly.pageSetup.orientation).toBe("landscape");
    expect(monthly.pageSetup.fitToWidth).toBe(1);
    expect(monthly.headerFooter.oddFooter).toMatch(/Page &P of &N/);

    const breakdown = workbook.getWorksheet("Breakdown")!;
    expect(breakdown.getCell("H2").value).toMatchObject({ formula: expect.stringMatching(/^IF\(SUM/) });
    const rates = workbook.getWorksheet("Rates")!;
    expect(rates.getCell("A2").value).toBeTruthy();
    expect(rates.getCell("D2").value).toEqual(expect.any(Number));
  });
});
