import { annualTotal, skuCatalog, tips, type Estimate, type ForecastPoint, type Portfolio } from "@dcf/engine";
import { exportCsv, exportJson, exportPdf } from "../export";
import { money } from "../format";
import { ForecastChart } from "./Chart";

interface InstrumentProps {
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  onPortfolio: (portfolio: Portfolio) => void;
}

export function Instrument({ portfolio, estimate, points, onPortfolio }: InstrumentProps) {
  const advice = tips(portfolio, estimate);
  const dbuShare = estimate.total > 0 ? (estimate.dbuCost / estimate.total) * 100 : 0;
  const cloudShare = estimate.total > 0 ? (estimate.cloudCost / estimate.total) * 100 : 0;
  const addonShare = estimate.total > 0 ? (estimate.addonCost / estimate.total) * 100 : 0;
  const forecast = portfolio.forecast;

  return (
    <aside className="instrument" aria-label="Forecast">
      <p className="hero-kicker">This month · steady state</p>
      <p className="hero-number" data-testid="monthly-total" aria-live="polite">
        {money(estimate.total)}
      </p>
      <p className="hero-sub">
        {money(estimate.dbuCost)} DBU · {money(estimate.cloudCost)} cloud
        {estimate.addonCost > 0 ? ` · ${money(estimate.addonCost)} add-on` : ""} · {money(annualTotal(points), 0)} next 12 months
      </p>
      <div className="split" aria-hidden="true">
        <span className="dbu" style={{ width: `${dbuShare}%` }} />
        <span className="cloud" style={{ width: `${cloudShare}%` }} />
        <span className="addon" style={{ width: `${addonShare}%` }} />
      </div>
      <div className="legend">
        <span><i className="swatch" style={{ background: "#e39a62" }} /> DBU</span>
        <span><i className="swatch" style={{ background: "#8fa884" }} /> Cloud infra</span>
        <span><i className="swatch" style={{ background: "#efe6d4" }} /> Add-on</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {([12, 24, 36] as const).map((months) => (
          <button
            key={months}
            type="button"
            className="btn"
            aria-pressed={forecast.months === months}
            onClick={() => onPortfolio({ ...portfolio, forecast: { ...forecast, months } })}
          >
            {months} mo
          </button>
        ))}
        <button
          type="button"
          className="btn"
          aria-pressed={forecast.seasonality === "flat"}
          onClick={() => onPortfolio({ ...portfolio, forecast: { ...forecast, seasonality: "flat" } })}
        >
          Flat year
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={forecast.seasonality === "retail"}
          onClick={() => onPortfolio({ ...portfolio, forecast: { ...forecast, seasonality: "retail" } })}
        >
          Retail season
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={forecast.seasonality === "custom"}
          onClick={() =>
            onPortfolio({
              ...portfolio,
              forecast: {
                ...forecast,
                seasonality: "custom",
                customSeasonality: forecast.customSeasonality?.length === 12 ? forecast.customSeasonality : Array(12).fill(1),
              },
            })
          }
        >
          Custom weights
        </button>
      </div>
      {forecast.seasonality === "custom" && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, index) => (
            <label key={month} className="field">
              {month}
              <input
                type="number"
                min={0.05}
                max={5}
                step={0.05}
                value={forecast.customSeasonality?.[index] ?? 1}
                onChange={(event) => {
                  const customSeasonality = [...(forecast.customSeasonality ?? Array(12).fill(1))];
                  customSeasonality[index] = Number(event.target.value);
                  onPortfolio({ ...portfolio, forecast: { ...forecast, customSeasonality } });
                }}
              />
            </label>
          ))}
        </div>
      )}
      <label className="field mb-4">
        Annual growth {Math.round(forecast.annualGrowth * 100)}%
        <input
          type="range"
          min={-30}
          max={80}
          step={1}
          value={Math.round(forecast.annualGrowth * 100)}
          onChange={(event) =>
            onPortfolio({ ...portfolio, forecast: { ...forecast, annualGrowth: Number(event.target.value) / 100 } })
          }
        />
      </label>

      <ForecastChart points={points} title={`${forecast.months} month forecast of DBU, cloud, and add-on cost`} />
      <p className="hint mt-2">Month 1 is the run-rate, bent by seasonality. Growth compounds from there. The shaded bands are cloud, then DBU, then add-on.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => exportCsv(portfolio, estimate, points)}>CSV</button>
        <button type="button" className="btn" onClick={() => exportJson(portfolio, estimate, points)}>JSON</button>
        <button type="button" className="btn" onClick={() => void exportPdf(portfolio, estimate, points)}>PDF</button>
      </div>

      <h2 className="section-label mt-6">Where it goes</h2>
      <table className="lines">
        <thead>
          <tr>
            <th>Workload</th>
            <th>DBU</th>
            <th>Cloud</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {estimate.lines.map((line) => (
            <tr key={line.workloadId}>
              <td>{line.name}</td>
              <td className="num">{money(line.dbuCost)}</td>
              <td className="num">{money(line.cloudCost)}</td>
              <td className="num">{money(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {advice.length > 0 && (
        <div className="tips">
          {advice.map((tip) => (
            <p key={tip.id} className={tip.tone === "warn" ? "tip warn" : "tip"}>
              {tip.text}
            </p>
          ))}
        </div>
      )}
      <p className="fine">
        Estimates only · catalog {skuCatalog.version} · verified {skuCatalog.verifiedOn}. Not a quote. {estimate.dbu.toLocaleString()} DBU this month.
      </p>
    </aside>
  );
}
