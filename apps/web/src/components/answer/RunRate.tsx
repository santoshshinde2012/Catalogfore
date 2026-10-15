import type { Estimate, UncertaintyBand } from "@dcf/engine";
import { money } from "../../format";

export function RunRate({
  name,
  eyebrow,
  estimate,
  monthBand,
}: {
  name: string;
  eyebrow: string;
  estimate: Estimate;
  monthBand: UncertaintyBand;
}) {
  const total = estimate.total || 1;
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{name.trim() || "Untitled forecast"}</h1>
      <p className="hero-number" data-testid="monthly-total" aria-live="polite">
        {money(estimate.total)}
      </p>
      <p className="lede hero-sub">
        This month’s run rate, about {money(monthBand.low)}–{money(monthBand.high)}. The year below includes growth.
      </p>
      <div className="split" aria-hidden="true">
        <span className="dbu" style={{ width: `${(estimate.dbuCost / total) * 100}%` }} />
        <span className="cloud" style={{ width: `${(estimate.cloudCost / total) * 100}%` }} />
        <span className="addon" style={{ width: `${(estimate.addonCost / total) * 100}%` }} />
      </div>
      <p className="legend">
        <span>
          <i className="swatch dbu" aria-hidden="true" /> DBU {money(estimate.dbuCost)}
        </span>
        <span>
          <i className="swatch cloud" aria-hidden="true" /> Cloud {money(estimate.cloudCost)}
        </span>
        {estimate.addonCost > 0 && (
          <span>
            <i className="swatch addon" aria-hidden="true" /> Add-on {money(estimate.addonCost)}
          </span>
        )}
      </p>
    </>
  );
}
