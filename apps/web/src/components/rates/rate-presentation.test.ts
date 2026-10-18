import { describe, expect, it } from "vitest";
import { regionalQuoteDelta } from "./rate-presentation";

describe("regionalQuoteDelta", () => {
  it("treats equal quotes as the same price", () => {
    expect(regionalQuoteDelta(0.1035, 0.1035)).toBe("Same price");
    expect(regionalQuoteDelta(0.1035, 0.1035 + 1e-12)).toBe("Same price");
  });

  it("names the absolute difference without implying a cheaper region is an error", () => {
    expect(regionalQuoteDelta(0.1035, 0.12)).toBe("$0.0165 higher");
    expect(regionalQuoteDelta(0.12, 0.1035)).toBe("$0.0165 lower");
  });
});
