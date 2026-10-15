import type { Recommendation, Tip } from "@dcf/engine";
import { money } from "../../format";

export function SavingsList({
  recommendations,
  watchouts,
  onApply,
}: {
  recommendations: Recommendation[];
  watchouts: Tip[];
  onApply: (id: Recommendation["id"]) => void;
}) {
  return (
    <>
      <h2>Changes that save money</h2>
      {recommendations.length === 0 ? (
        <p className="hint">
          Nothing on this forecast beats the way it is modeled. Edit a workload or the assumptions if that seems wrong.
        </p>
      ) : (
        <div className="rec-list">
          {recommendations.map((rec) => (
            <article key={rec.id} className="rec">
              <div>
                <h3>{rec.title}</h3>
                <p className="hint">{rec.detail}</p>
              </div>
              <div className="rec-side">
                <p className="save">{money(rec.annualSavings)}</p>
                <p className="per">saved / year</p>
                <button
                  type="button"
                  className="btn-primary"
                  aria-label={`Apply ${rec.title}`}
                  onClick={() => onApply(rec.id)}
                >
                  Apply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {watchouts.length > 0 && (
        <div className="tips">
          {watchouts.map((tip) => (
            <p key={tip.id} className="tip warn">
              {tip.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
