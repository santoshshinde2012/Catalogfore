/** Genie Code's included user usage, in DBU per user per month. Docs, through 2027-01-31. */
const GENIE_FREE_DBU_PER_USER = 150;

/** First instant after the Genie promo window. 2027-02-01 00:00 UTC. */
const GENIE_WINDOW_END = Date.parse("2027-02-01T00:00:00Z");
/** Stable catalog pricing date for callers without a forecast date. */
export const DEFAULT_FORMULA_DATE = "2026-10-17";

/** 0.75 through 2027-01-31, then 1. Genie Code's 25% promo is inside this factor. */
export function geniePromoFactor(now = Date.parse(DEFAULT_FORMULA_DATE)): number {
  return now < GENIE_WINDOW_END ? 0.75 : 1;
}

/** Genie One and Genie Agents user LLM usage is free through 2027-01-31. */
export function genieUserUsageFree(now = Date.parse(DEFAULT_FORMULA_DATE)): boolean {
  return now < GENIE_WINDOW_END;
}

export { GENIE_FREE_DBU_PER_USER };
