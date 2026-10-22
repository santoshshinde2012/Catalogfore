/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readUsageWithProgress } from "./read-with-progress";

describe("usage reads with progress", () => {
  it("reports each stage for a text file and rejects an oversized upload", async () => {
    const marks: number[] = [];
    const file = { size: 12, text: async () => "usage,rows" } as File;
    const result = await readUsageWithProgress(file, (ratio) => marks.push(ratio));
    expect(result.ok).toBe(true);
    expect(marks[0]).toBeGreaterThan(0);
    expect(marks.at(-1)).toBe(1);

    const huge = { size: 8_000_001, text: async () => "" } as File;
    const blocked = await readUsageWithProgress(huge, () => undefined);
    expect(blocked).toEqual({ ok: false, error: "That file is too large." });
  });

  it("uses the reader progress events for a real blob", async () => {
    const marks: number[] = [];
    const blob = new File(["usage_date,sku\n"], "usage.csv", { type: "text/csv" });
    const result = await readUsageWithProgress(blob, (ratio) => marks.push(ratio));
    expect("ok" in result).toBe(true);
    expect(marks.at(-1)).toBe(1);
  });
});
