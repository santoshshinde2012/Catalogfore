import type { Estimate } from "@dcf/engine";
import { money } from "../../format";

export function WhyList({ estimate }: { estimate: Estimate }) {
  return (
    <>
      <h2>Why this number</h2>
      {estimate.lines.length === 0 && <p className="hint">Add a workload and the arithmetic shows up here.</p>}
      <ul className="why">
        {estimate.lines.map((line) => (
          <li key={line.workloadId}>
            <div className="entry-row">
              <strong>{line.name}</strong>
              <span className="entry-cost">{money(line.total)}</span>
            </div>
            {line.notes.map((note) => (
              <p key={note} className="hint">
                {note}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {estimate.warnings.map((warning) => (
        <p key={warning} className="hint">
          {warning}
        </p>
      ))}
    </>
  );
}
