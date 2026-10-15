import { annualTotal, skuCatalog, type Estimate, type ForecastPoint, type Portfolio } from "@dcf/engine";
import { money } from "../format";

interface SummaryProps {
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
}

export function Summary({ portfolio, estimate, points }: SummaryProps) {
  const dbuShare = estimate.total > 0 ? (estimate.dbuCost / estimate.total) * 100 : 0;
  const cloudShare = estimate.total > 0 ? (estimate.cloudCost / estimate.total) * 100 : 0;
  const addonShare = estimate.total > 0 ? (estimate.addonCost / estimate.total) * 100 : 0;
  return (
    <section className="summary wrap" aria-label="This month">
      <p className="eyebrow">
        {portfolio.name} · {portfolio.cloud.toUpperCase()} · {portfolio.region}
      </p>
      <h1 className="hero-number" data-testid="monthly-total" aria-live="polite">
        {money(estimate.total)}
      </h1>
      <p className="lede hero-sub">
        {money(estimate.dbuCost)} DBU · {money(estimate.cloudCost)} cloud
        {estimate.addonCost > 0 ? ` · ${money(estimate.addonCost)} add-on` : ""} · {money(annualTotal(points), 0)} next 12 months
      </p>
      <div className="split" aria-hidden="true">
        <span className="dbu" style={{ width: `${dbuShare}%` }} />
        <span className="cloud" style={{ width: `${cloudShare}%` }} />
        <span className="addon" style={{ width: `${addonShare}%` }} />
      </div>
      <div className="legend">
        <span><i className="swatch" style={{ background: "var(--accent)" }} /> DBU</span>
        <span><i className="swatch" style={{ background: "var(--green)" }} /> Cloud</span>
        <span><i className="swatch" style={{ background: "var(--amber)" }} /> Add-on</span>
      </div>
      <p className="meta">Estimates only · catalog {skuCatalog.version} · not a quote</p>
    </section>
  );
}
