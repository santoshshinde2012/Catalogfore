import { append, source, type RowContext } from "./context.js";

export function genieConditions(context: RowContext, formula: string) {
  const sources = [
    source(
      "Genie user allowances and promotions",
      "https://docs.databricks.com/aws/en/genie/monitor-cost",
      "consumption",
    ),
  ];
  append(context, {
    componentId: "user_allowance",
    componentName: "Eligible monthly user allowance",
    unit: "DBU/user-month",
    rateKind: "allowance",
    value: 150,
    status: "conditional",
    confidence: "cited",
    sources,
    formula: "max(0, per-user usage − 150 DBU) × eligible users",
    conditions: ["Users only; service principals are excluded."],
    notes: ["This is an allowance, not a fixed cost per user. Connected SQL and other service usage remain separate."],
  });
  append(context, {
    componentId: "promotion",
    componentName: formula === "genie_code" ? "Genie Code metering promotion" : "Genie eligible user free window",
    unit: "multiplier",
    rateKind: "multiplier",
    value: formula === "genie_code" ? 0.75 : 0,
    status: "conditional",
    confidence: "cited",
    effectiveTo: "2027-02-01T00:00:00Z",
    sources,
    formula:
      formula === "genie_code"
        ? "Eligible above-allowance raw DBU × 0.75 during promotion"
        : "Eligible user LLM DBU × 0 during promotion",
    conditions: [
      "Eligible users only; applies through 2027-01-31 UTC.",
      "Do not apply again to imported metered or billed DBU quantities.",
    ],
    notes: [
      "Underlying list-price rows remain separate. Future eligibility and pricing must be checked against current sources.",
    ],
  });
}
