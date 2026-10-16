import type { SimpleSession } from "../../hooks/useSimpleForecast";
import { AdvancedBuilder } from "./AdvancedBuilder";
import { CustomerNote } from "./CustomerNote";
import { ForecastDetail, YearHeadline } from "./ForecastOutcome";
import { PlanForm } from "./PlanForm";
import { SavingsAside } from "./SavingsAside";
import { UsagePanel } from "./UsagePanel";

export function SimplePage({ session }: { session: SimpleSession }) {
  return (
    <article className="simple">
      <header className="simple-intro">
        <p className="eyebrow">Fathom</p>
        <h1>What does the next year cost?</h1>
        <p className="lede">
          A 12-month range from four inputs. For a team that is evaluating, new, or writing a budget.
        </p>
      </header>
      <YearHeadline
        annual={session.annual}
        spreadPercent={session.spreadPercent}
        cloudShare={session.cloudShare}
        firstMonth={session.months[0]?.expected ?? 0}
      />
      {session.usingDetail && (
        <p className="tip warn" role="status">
          The detailed workloads are driving this forecast. Change an input below to go back to the four-input model.
        </p>
      )}
      <PlanForm
        plan={session.plan}
        listMonthly={session.listMonthly}
        usageLocked={session.usingUsage}
        onCloud={session.setCloud}
        onTier={session.setTier}
        onRegion={session.setRegion}
        onSpend={session.setSpend}
        onPreset={session.setPreset}
        onMix={session.setMix}
        onGrowth={session.setGrowth}
        onCommit={session.setCommit}
        onClearUsage={session.clearUsage}
      />
      <ForecastDetail
        annual={session.annual}
        spreadPercent={session.spreadPercent}
        cloudShare={session.cloudShare}
        months={session.months}
        portfolio={session.portfolio}
        estimate={session.estimate}
        points={session.points}
        notice={session.notice}
        onShare={() => void session.share()}
      />
      <details className="fold">
        <summary>How we got this</summary>
        <ul className="explain">
          {session.assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <SavingsAside recommendations={session.recommendations} onApply={session.applyTip} />
      <UsagePanel
        busy={session.usageBusy}
        error={session.usageError}
        onFile={session.loadUsageFile}
        onSample={session.loadSample}
      />
      <AdvancedBuilder
        open={session.usingDetail}
        portfolio={session.portfolio}
        estimate={session.estimate}
        selectedId={session.selectedId}
        onPortfolio={session.editPortfolio}
        onSelect={session.selectWorkload}
        onRemove={session.removeWorkload}
      />
      <CustomerNote />
    </article>
  );
}
