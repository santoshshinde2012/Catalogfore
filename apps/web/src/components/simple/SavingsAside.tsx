import type { Recommendation, RecommendationId } from "@dcf/engine";
import { money } from "../../format";

const PLAIN: Record<RecommendationId, { title: string; detail: string }> = {
  jobs_serverless: {
    title: "Move pipelines to serverless",
    detail: "Drops the separate machine charge and uses the managed rate.",
  },
  photon_speedup_2: {
    title: "Assume the jobs finish in half the time",
    detail: "Only if you have timed them. The faster engine still has a list price.",
  },
  spot_70: {
    title: "Use spare cloud capacity for pipelines",
    detail: "About 70% of the worker machines. The driver stays on demand.",
  },
  commit_37: {
    title: "Ask for a 37% commitment discount",
    detail: "A planning assumption for the Databricks portion, not an offer.",
  },
  commit_37_cloud_30: {
    title: "Commitment discount, plus 30% off machines",
    detail: "Both numbers are planning assumptions until a contract says otherwise.",
  },
  autostop_notebooks: {
    title: "Turn notebooks off after 8 hours",
    detail: "Only saves money if they are actually left running.",
  },
  autostop_sql: {
    title: "Stop the warehouse overnight",
    detail: "Skip this if dashboards need it up.",
  },
  rightsize: {
    title: "Drop a machine and re-time the job",
    detail: "A sizing assumption. Re-time the job before you drop another.",
  },
};

export function SavingsAside({
  recommendations,
  onApply,
}: {
  recommendations: Recommendation[];
  onApply: (id: RecommendationId) => void;
}) {
  return (
    <details className="fold">
      <summary>Ways to pay less</summary>
      {recommendations.length === 0 ? (
        <p className="hint">Nothing here beats the current inputs.</p>
      ) : (
        <ul className="tip-list">
          {recommendations.map((item) => {
            const plain = PLAIN[item.id];
            return (
              <li key={item.id}>
                <div>
                  <strong>{plain.title}</strong>
                  <p className="hint">{plain.detail}</p>
                </div>
                <button type="button" className="btn" onClick={() => onApply(item.id)}>
                  Apply, save {money(item.annualSavings, 0)} a year
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
