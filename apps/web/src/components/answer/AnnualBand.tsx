import type { UncertaintyBand } from "@dcf/engine";
import { money } from "../../format";

export function AnnualBand({ band, year, budget }: { band: UncertaintyBand; year: number; budget?: number }) {
  return (
    <>
      <h2>First 12 months</h2>
      <div className="band" aria-label="Annual range">
        <div>
          <span className="who">Low</span>
          <strong>{money(band.low)}</strong>
        </div>
        <div>
          <span className="who">Expected</span>
          <strong>{money(band.expected)}</strong>
        </div>
        <div>
          <span className="who">High</span>
          <strong>{money(band.high)}</strong>
        </div>
      </div>
      {band.reasons.map((reason) => (
        <p key={reason} className="hint">
          {reason}
        </p>
      ))}
      {budget != null && budget > 0 && (
        <p className={year > budget ? "delta over" : "delta under"}>
          {year > budget
            ? `${money(year - budget)} over the ${money(budget)} budget in the expected case.`
            : `${money(budget - year)} under the ${money(budget)} budget in the expected case.`}
        </p>
      )}
    </>
  );
}
