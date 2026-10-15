import { skuCatalog, type Portfolio } from "@dcf/engine";
import { moveCloud, regionHint, setBudget } from "../../model/cloud";

export function AssumptionsForm({
  portfolio,
  regionSource,
  onPortfolio,
}: {
  portfolio: Portfolio;
  regionSource: string;
  onPortfolio: (portfolio: Portfolio) => void;
}) {
  return (
    <section className="assumptions" aria-label="Portfolio assumptions">
      <label className="field">
        Forecast name
        <input
          value={portfolio.name}
          maxLength={80}
          onChange={(event) => onPortfolio({ ...portfolio, name: event.target.value })}
        />
      </label>
      <div className="grid-3">
        <label className="field">
          Cloud
          <select
            value={portfolio.cloud}
            onChange={(event) => onPortfolio(moveCloud(portfolio, event.target.value as Portfolio["cloud"]))}
          >
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
        </label>
        <label className="field">
          Region
          <select
            value={portfolio.region}
            onChange={(event) => onPortfolio({ ...portfolio, region: event.target.value })}
          >
            {skuCatalog.regions
              .filter((item) => item.cloud === portfolio.cloud)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Tier
          <select
            value={portfolio.tier}
            onChange={(event) => onPortfolio({ ...portfolio, tier: event.target.value as Portfolio["tier"] })}
          >
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
      </div>
      <p className="hint">{regionHint(regionSource)}</p>
      <div className="grid-2">
        <label className="field">
          Annual growth, {Math.round(portfolio.forecast.annualGrowth * 100)}%
          <input
            type="range"
            min={-20}
            max={100}
            step={1}
            value={Math.round(portfolio.forecast.annualGrowth * 100)}
            onChange={(event) =>
              onPortfolio({
                ...portfolio,
                forecast: { ...portfolio.forecast, annualGrowth: Number(event.target.value) / 100 },
              })
            }
          />
        </label>
        <label className="field">
          Annual budget
          <input
            type="number"
            min={0}
            step={1000}
            inputMode="decimal"
            placeholder="Optional"
            value={portfolio.budgetAnnual ?? ""}
            onChange={(event) => onPortfolio(setBudget(portfolio, event.target.value))}
          />
        </label>
      </div>
      <div className="horizon" role="group" aria-label="Horizon">
        {([12, 24, 36] as const).map((months) => (
          <button
            key={months}
            type="button"
            className="btn"
            aria-pressed={portfolio.forecast.months === months}
            onClick={() => onPortfolio({ ...portfolio, forecast: { ...portfolio.forecast, months } })}
          >
            {months} months
          </button>
        ))}
      </div>
      <label className="field">
        Seasonality
        <select
          value={portfolio.forecast.seasonality === "custom" ? "custom" : portfolio.forecast.seasonality}
          onChange={(event) => {
            const seasonality = event.target.value === "retail" ? "retail" : "flat";
            onPortfolio({ ...portfolio, forecast: { ...portfolio.forecast, seasonality } });
          }}
        >
          <option value="flat">Flat year</option>
          <option value="retail">Heavier in autumn</option>
          {portfolio.forecast.seasonality === "custom" && <option value="custom">Custom weights</option>}
        </select>
      </label>
      <div className="grid-3">
        <label className="field">
          DBU commit
          <input
            type="range"
            min={0}
            max={95}
            step={1}
            value={Math.round(portfolio.commitment.dbuDiscount * 100)}
            onChange={(event) =>
              onPortfolio({
                ...portfolio,
                commitment: { ...portfolio.commitment, dbuDiscount: Number(event.target.value) / 100 },
              })
            }
          />
          <span>{Math.round(portfolio.commitment.dbuDiscount * 100)}% off the DBU line</span>
        </label>
        <label className="field">
          VM commit
          <input
            type="range"
            min={0}
            max={95}
            step={1}
            value={Math.round(portfolio.commitment.cloudDiscount * 100)}
            onChange={(event) =>
              onPortfolio({
                ...portfolio,
                commitment: { ...portfolio.commitment, cloudDiscount: Number(event.target.value) / 100 },
              })
            }
          />
          <span>{Math.round(portfolio.commitment.cloudDiscount * 100)}% off on-demand VMs</span>
        </label>
        <label className="field">
          Add-on
          <select
            value={portfolio.addon}
            onChange={(event) => onPortfolio({ ...portfolio, addon: event.target.value as Portfolio["addon"] })}
          >
            <option value="none">None</option>
            <option value="compliance">Compliance +10%</option>
            <option value="mission_critical">Mission critical +30%</option>
          </select>
        </label>
      </div>
    </section>
  );
}
