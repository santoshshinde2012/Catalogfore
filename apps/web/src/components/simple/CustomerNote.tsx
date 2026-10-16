export function CustomerNote() {
  return (
    <aside className="customer-note" aria-labelledby="customer-heading">
      <h2 id="customer-heading">Already a Databricks customer?</h2>
      <p>
        Usage Dashboard 2.0, budgets, and <code>ai_forecast</code> forecast from billing history. They need an account
        admin and a workspace that can read <code>system.billing.usage</code>. This page is for a team that is
        evaluating, new, or planning before that history exists.
      </p>
      <ul>
        <li>
          <a href="https://docs.databricks.com/aws/en/admin/account-settings/usage">Usage dashboards</a>
          <span> Version 2.0 includes cost forecasting.</span>
        </li>
        <li>
          <a href="https://docs.databricks.com/aws/en/admin/account-settings/budgets">Budgets</a>
          <span> A monthly limit and an alert. Not a hard cap.</span>
        </li>
        <li>
          <a href="https://docs.databricks.com/aws/en/sql/language-manual/functions/ai_forecast">ai_forecast</a>
          <span> Extends a usage table you already have.</span>
        </li>
      </ul>
    </aside>
  );
}
