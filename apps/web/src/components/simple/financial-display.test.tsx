import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estimate, portfolioFromUsage } from "@cayfore/engine";
import { Breakdown } from "./Breakdown";
import { yearCopy } from "./ForecastOutcome";

describe("signed billing display", () => {
  it("does not turn an imported net credit into a zero-dollar explanation", () => {
    expect(yearCopy(-120, 0, { low: -130, high: -110 }).sentence).toContain("-$120");
  });

  it("announces the actual asymmetric range and qualifies unresolved annual costs", () => {
    const range = { low: 85, high: 120 };
    expect(yearCopy(100, 0, range).sentence).toBe("About $100 per year. Planning range $85 to $120.");
    expect(yearCopy(100, 0, range, true).sentence).toContain(
      "Known annual subtotal $100; unresolved charges are excluded.",
    );
  });

  it("lists negative credits while limiting the donut to positive charges", () => {
    const csv = [
      "sku_name,cloud,usage_date,usage_quantity,usage_unit,list_price,currency_code",
      "PREMIUM_JOBS_COMPUTE,AWS,2026-09-01,100,DBU,0.1,USD",
      "PREMIUM_SQL_SERVERLESS_COMPUTE,AWS,2026-09-01,-10,DBU,0.1,USD",
    ].join("\n");
    const loaded = portfolioFromUsage(csv, { asOf: "2026-10-17" });
    const result = estimate(loaded.portfolio);
    expect(result.total).toBe(9);
    const html = renderToStaticMarkup(<Breakdown estimate={result} />);
    expect(html).toContain("-$1");
    expect(html).toContain("Credits are listed separately");
  });
});
