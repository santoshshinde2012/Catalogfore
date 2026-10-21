import { describe, expect, it } from "vitest";
import { rateConfidenceScore } from "./rate-confidence.js";

describe("rate confidence cells", () => {
  it("returns the stored score for a measured reference cell", () => {
    expect(rateConfidenceScore("aws", "us-east-1", "premium", "jobs_classic")).toBe(92);
  });

  it("returns undefined when the price book has no cell", () => {
    expect(rateConfidenceScore("aws", "not-a-region", "premium", "jobs_classic")).toBeUndefined();
  });
});
