import { describe, expect, it } from "vitest";
import { neutralizeSpreadsheetFormula, pdfPlain } from "./spreadsheet.js";

describe("spreadsheet export safety", () => {
  it("prefixes formula triggers and leaves ordinary text alone", () => {
    expect(neutralizeSpreadsheetFormula("=1+1")).toBe("'=1+1");
    expect(neutralizeSpreadsheetFormula("+1")).toBe("'+1");
    expect(neutralizeSpreadsheetFormula("-cmd")).toBe("'-cmd");
    expect(neutralizeSpreadsheetFormula("@sum")).toBe("'@sum");
    expect(neutralizeSpreadsheetFormula("Nightly")).toBe("Nightly");
    expect(neutralizeSpreadsheetFormula("100")).toBe("100");
  });

  it("strips control characters from PDF text", () => {
    expect(pdfPlain("Nightly\u0000 job")).toBe("Nightly job");
    expect(pdfPlain("x".repeat(20), 4)).toBe("xxxx");
  });

  it.each(["\t", "\r", "\n", "＝", "＋", "－", "＠"])(
    "keeps control or locale-specific formula prefix %j as text",
    (prefix) => {
      const value = `${prefix}=HYPERLINK("https://example.invalid","Open")`;
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
      expect(neutralizeSpreadsheetFormula(`'${value}`)).toBe(`'${value}`);
    },
  );
});
