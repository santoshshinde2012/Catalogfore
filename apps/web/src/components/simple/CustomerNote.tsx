export function CustomerNote() {
  return (
    <aside className="rounded-lg border bg-card px-4 py-4 shadow-sm" aria-labelledby="customer-heading">
      <h2 id="customer-heading" className="text-sm font-medium">
        Already a Databricks customer?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Usage Dashboard 2.0, budgets, and <code className="font-mono text-xs">ai_forecast</code> forecast from billing
        history. They need an account admin and a workspace that can read{" "}
        <code className="font-mono text-xs">system.billing.usage</code>. This page is for a team that is evaluating,
        new, or planning before that history exists.
      </p>
      <ul className="mt-3 grid gap-2 text-sm">
        <li>
          <a
            className="font-medium text-link underline-offset-4 hover:underline"
            href="https://docs.databricks.com/aws/en/admin/account-settings/usage"
          >
            Usage dashboards
          </a>
          <span className="text-muted-foreground"> Version 2.0 includes cost forecasting.</span>
        </li>
        <li>
          <a
            className="font-medium text-link underline-offset-4 hover:underline"
            href="https://docs.databricks.com/aws/en/admin/account-settings/budgets"
          >
            Budgets
          </a>
          <span className="text-muted-foreground"> A monthly limit and an alert. Not a hard cap.</span>
        </li>
        <li>
          <a
            className="font-medium text-link underline-offset-4 hover:underline"
            href="https://docs.databricks.com/aws/en/sql/language-manual/functions/ai_forecast"
          >
            ai_forecast
          </a>
          <span className="text-muted-foreground"> Extends a usage table you already have.</span>
        </li>
      </ul>
    </aside>
  );
}
