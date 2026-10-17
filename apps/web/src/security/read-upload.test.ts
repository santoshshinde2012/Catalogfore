import { defaultPlan, projectSimple } from "@cayfore/engine";
import { describe, expect, it } from "vitest";
import { readForecastFile } from "./read-upload";

function file(body: string): File {
  return { size: body.length, text: async () => body } as File;
}

describe("saved forecast boundary", () => {
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
