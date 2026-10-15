import {
  applyRecommendation,
  regionInfo,
  skuCatalog,
  type Estimate,
  type ForecastPoint,
  type Portfolio,
} from "@dcf/engine";
import { useAnswerView } from "../hooks/useAnswerView";
import { Actuals } from "./Actuals";
import { ForecastChart } from "./Chart";
import { Ledger } from "./Ledger";
import { AnnualBand } from "./answer/AnnualBand";
import { AssumptionsForm } from "./answer/AssumptionsForm";
import { ExportBar } from "./answer/ExportBar";
import { MethodNotes } from "./answer/MethodNotes";
import { RunRate } from "./answer/RunRate";
import { SavingsList } from "./answer/SavingsList";
import { WhyList } from "./answer/WhyList";

interface AnswerProps {
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}

export function Answer({ portfolio, estimate, points, selectedId, onPortfolio, onSelect, onRemove }: AnswerProps) {
  const view = useAnswerView(portfolio, estimate, points);
  const region = regionInfo(portfolio.cloud, portfolio.region);
  return (
    <article className="sheet" id="forecast">
      <RunRate
        name={portfolio.name}
        eyebrow={`${portfolio.cloud.toUpperCase()} · ${region.label} · ${portfolio.tier}${view.monthBand.calibrated ? " · calibrated" : ""}`}
        estimate={estimate}
        monthBand={view.monthBand}
      />
      <AnnualBand band={view.yearBand} year={view.year} budget={portfolio.budgetAnnual} />
      <p className="fine">{skuCatalog.disclaimer}</p>
      <ExportBar portfolio={portfolio} estimate={estimate} points={points} />
      <WhyList estimate={estimate} />
      <SavingsList
        recommendations={view.recommendations}
        watchouts={view.watchouts}
        onApply={(id) => onPortfolio(applyRecommendation(portfolio, id))}
      />
      <h2>Assumptions you can change</h2>
      <AssumptionsForm portfolio={portfolio} regionSource={region.source} onPortfolio={onPortfolio} />
      <Ledger
        portfolio={portfolio}
        estimate={estimate}
        selectedId={selectedId}
        onPortfolio={onPortfolio}
        onSelect={onSelect}
        onRemove={onRemove}
      />
      <h2>The year, month by month</h2>
      <ForecastChart
        points={points}
        title={`${portfolio.forecast.months} month forecast for ${portfolio.name || "this forecast"}`}
      />
      <p className="hint">
        Green is cloud infrastructure, indigo is DBUs, amber is an add-on. Month 1 is this run rate
        {portfolio.forecast.seasonality === "flat" ? "" : " adjusted for seasonality"}. Later months compound at{" "}
        {Math.round(portfolio.forecast.annualGrowth * 100)}% a year.
      </p>
      <Actuals portfolio={portfolio} onPortfolio={onPortfolio} />
      <MethodNotes />
    </article>
  );
}
