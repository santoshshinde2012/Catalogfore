import {
  annualTotal,
  recommendations,
  tips,
  uncertaintyBand,
  type Estimate,
  type ForecastPoint,
  type Portfolio,
  type Tip,
} from "@dcf/engine";
import { useMemo } from "react";
import type { Recommendation, UncertaintyBand } from "@dcf/engine";

export interface AnswerView {
  year: number;
  monthBand: UncertaintyBand;
  yearBand: UncertaintyBand;
  recommendations: Recommendation[];
  watchouts: Tip[];
}

export function useAnswerView(portfolio: Portfolio, estimate: Estimate, points: ForecastPoint[]): AnswerView {
  const year = annualTotal(points);
  const monthBand = useMemo(() => uncertaintyBand(estimate.total, portfolio, estimate), [estimate, portfolio]);
  const yearBand = useMemo(() => uncertaintyBand(year, portfolio, estimate), [year, portfolio, estimate]);
  const recs = useMemo(() => recommendations(portfolio), [portfolio]);
  const watchouts = useMemo(
    () =>
      tips(portfolio, estimate)
        .filter((tip) => tip.tone === "warn")
        .slice(0, 3),
    [portfolio, estimate],
  );
  return { year, monthBand, yearBand, recommendations: recs, watchouts };
}
