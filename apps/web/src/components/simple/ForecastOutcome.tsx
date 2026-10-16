import type { Estimate, ForecastPoint, Portfolio, SimpleMonth } from "@dcf/engine";
import { money } from "../../format";
import { ExportBar } from "../answer/ExportBar";
import { BandChart } from "./BandChart";
import { MonthTable } from "./MonthTable";

export function yearCopy(annual: number, spreadPercent: number, cloudShare: number) {
  const sentence =
    annual > 0 ? `About ${money(annual, 0)} per year, ±${spreadPercent}%.` : `About ${money(0, 0)} per year.`;
  const split =
    cloudShare <= 0.005
      ? "This mix has no separate machine charge."
      : `${Math.round(cloudShare * 100)}% of the bill is cloud machines.`;
  return { sentence, split };
}

export function YearHeadline({
  annual,
  spreadPercent,
  cloudShare,
  firstMonth,
}: {
  annual: number;
  spreadPercent: number;
  cloudShare: number;
  firstMonth: number;
}) {
  const { sentence, split } = yearCopy(annual, spreadPercent, cloudShare);
  return (
    <div className="year-head" id="forecast">
      <p className="year-sentence" data-testid="year-sentence" aria-live="polite">
        {sentence}
      </p>
      <p className="hero-number" data-testid="year-total">
        {money(annual, 0)}
      </p>
      <p className="hint" data-testid="bill-split">
        {split} First month {money(firstMonth, 0)}.
      </p>
    </div>
  );
}

export function ForecastDetail({
  annual,
  spreadPercent,
  cloudShare,
  months,
  portfolio,
  estimate,
  points,
  onShare,
  notice,
}: {
  annual: number;
  spreadPercent: number;
  cloudShare: number;
  months: SimpleMonth[];
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  onShare: () => void;
  notice: string;
}) {
  const { sentence, split } = yearCopy(annual, spreadPercent, cloudShare);
  return (
    <section aria-labelledby="chart-heading">
      <h2 id="chart-heading" className="sr-only">
        Twelve month chart
      </h2>
      <BandChart months={months} label={`${sentence} ${split}`} />
      <p className="hint">The shaded band is the low-to-high range. The line is the expected month.</p>
      <MonthTable months={months} />
      <div className="row-actions">
        <button type="button" className="btn" onClick={onShare}>
          {notice || "Copy link"}
        </button>
        <ExportBar portfolio={portfolio} estimate={estimate} points={points} />
      </div>
      <p className="fine">Estimates only. Not a Databricks quote, and not affiliated with Databricks.</p>
    </section>
  );
}
