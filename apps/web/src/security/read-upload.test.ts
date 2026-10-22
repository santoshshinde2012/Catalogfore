import {
  blankPortfolio,
  defaultPlan,
  JSON_MAX_CHARS,
  projectPortfolio,
  projectSimple,
  UPLOAD_MAX_CHARS,
} from "@cayfore/engine";
import { describe, expect, it, vi } from "vitest";
import { forecastJson } from "../export-data";
import { readForecastFile } from "./read-upload";

function file(body: string): File {
  return { size: body.length, text: async () => body } as File;
}

describe("saved forecast boundary", () => {
  it("rejects uploads above the file limit before reading them", async () => {
    const text = vi.fn(async () => "{}");
    const result = await readForecastFile({ size: UPLOAD_MAX_CHARS + 1, text } as unknown as File);
    expect(result).toEqual({ ok: false, error: "That file is too large." });
    expect(text).not.toHaveBeenCalled();
  });

  it("reopens a supported large portfolio's own JSON export", async () => {
    const result = projectPortfolio({
      ...blankPortfolio(),
      workloads: Array.from({ length: 1000 }, (_, index) => ({
        id: `storage-${index}`,
        name: `Archive ${index} ${"s".repeat(60)}`,
        kind: "storage",
        gbMonth: 1000,
        managed: true,
        cloud: "aws",
        region: "us-east-1",
        tier: "premium",
      })),
    });
    const body = forecastJson(result);
    expect(body.length).toBeGreaterThan(JSON_MAX_CHARS);
    const reopened = await readForecastFile(file(body));
    expect(reopened.ok).toBe(true);
    if (reopened.ok) expect(reopened.value.workloads).toEqual(result.portfolio.workloads);
  });

  it.each(["{}", "[]", '{"hello":"world"}', '{"portfolio":{}}', '{"version":2,"portfolio":{}}', "invalid"])(
    "rejects unrelated or unsupported JSON: %s",
    async (body) => {
      expect((await readForecastFile(file(body))).ok).toBe(false);
    },
  );
  it("accepts a versioned plan and the documented export envelope", async () => {
    const portfolio = projectSimple(defaultPlan()).portfolio;
    for (const value of [portfolio, { format: "cayfore.forecast", version: 1, portfolio }]) {
      const parsed = await readForecastFile(file(JSON.stringify(value)));
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(parsed.value.workloads).toEqual(portfolio.workloads);
    }
  });
});
