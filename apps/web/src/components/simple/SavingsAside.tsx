import type { Recommendation, RecommendationId } from "@cayfore/engine";
import { money } from "../../format";
import { Button } from "../ui/button";

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
    <section className="grid gap-3" aria-labelledby="savings-heading">
      <h2 id="savings-heading" className="text-sm font-semibold">
        Ways to pay less
      </h2>
      <p className="text-xs text-muted-foreground">
        Each option compares with the current plan. Savings overlap; do not add them together. Applying an option
        recalculates the remaining choices.
      </p>
      {recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground">None of these changes lower the forecast.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {recommendations.map((item) => {
            const plain = PLAIN[item.id];
            return (
              <li key={item.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xl font-semibold tracking-tight tabular-nums">
                  {money(item.annualSavings, 0)}
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">a year</span>
                </p>
                <div>
                  <p className="text-sm font-medium">{plain.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{plain.detail}</p>
                </div>
                <Button type="button" variant="outline" className="mt-auto" onClick={() => onApply(item.id)}>
                  Apply, save {money(item.annualSavings, 0)} a year
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
