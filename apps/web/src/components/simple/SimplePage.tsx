import { ChevronDown } from "lucide-react";
import { projectPortfolio, repricePortfolio } from "@cayfore/engine";
import { useMemo, type ReactNode } from "react";
import type { SimpleSession } from "../../hooks/useSimpleForecast";
import { Card } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { AdvancedBuilder } from "./AdvancedBuilder";
import { CustomerNote } from "./CustomerNote";
import { ResultsPanel } from "./ForecastOutcome";
import { PlanForm } from "./PlanForm";
import { SavingsAside } from "./SavingsAside";
import { UsagePanel } from "./UsagePanel";
import { UsageReview } from "./UsageReview";
import { BudgetScenarioPanel } from "./BudgetScenarioPanel";
import { Button } from "../ui/button";
import { ActualUsageDetails } from "./ActualUsageDetails";
import { MobileForecastBar } from "./MobileForecastBar";

export function SimplePage({
  session,
  howOpen,
  onHowOpen,
  advancedAsk,
}: {
  session: SimpleSession;
  howOpen: boolean;
  onHowOpen: (open: boolean) => void;
  advancedAsk: number;
}) {
  const comparison = useMemo(
    () =>
      session.comparison
        ? {
            name: session.comparison.name,
            projection: projectPortfolio(session.comparison.portfolio),
          }
        : undefined,
    [session.comparison],
  );
  return (
    <article className="mx-auto w-full max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:pb-16">
      <header className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Databricks cost planner
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          What does the next year cost?
        </h1>
        <p className="mt-3 text-base text-muted-foreground text-pretty sm:text-lg">
          Estimate a new workload or plan from your usage. Compare changes, check a budget, and share the assumptions.
        </p>
      </header>
      {session.canUndo && (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={session.undoRemove}>
          Undo last change
        </Button>
      )}

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card id="plan-inputs" tabIndex={-1} aria-labelledby="inputs-heading" className="min-w-0 p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
            <h2 id="inputs-heading" className="text-lg font-semibold">
              Plan inputs
            </h2>
            <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {session.usingUsage ? "Imported baseline" : session.usingDetail ? "By product" : "Quick estimate"}
            </span>
          </div>
          {session.usingDetail && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-sm" role="status">
              <p>The detailed workloads are driving this forecast. Growth and pricing changes preserve your work.</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={session.resetToQuick}>
                Switch to quick estimate
              </Button>
            </div>
          )}
          <PlanForm
            plan={session.plan}
            listMonthly={session.listMonthly}
            usageLocked={session.usingUsage}
            detailLocked={session.usingDetail}
            fittedForecast={Boolean(session.portfolio.usage?.forecast || session.portfolio.simple?.usageForecast)}
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
          <div className="mt-6 grid gap-3 border-t pt-6">
            <UsagePanel
              busy={session.usageBusy}
              error={session.usageError}
              onFile={session.loadUsageFile}
              onSample={session.loadSample}
              onHistorySample={() => session.loadSample("history")}
            />
            <AdvancedBuilder
              ask={advancedAsk}
              portfolio={session.portfolio}
              estimate={session.estimate}
              selectedId={session.selectedId}
              onPortfolio={session.editPortfolio}
              onSelect={session.selectWorkload}
              onRemove={session.removeWorkload}
              onUsageFile={session.loadUsageFile}
            />
          </div>
        </Card>

        <div className="min-w-0">
          <Card className="p-5 shadow-[0_1px_2px_rgb(11_32_38/0.04),0_12px_32px_rgb(11_32_38/0.06)] sm:p-6">
            <ResultsPanel
              projection={session.forecastResult}
              comparison={comparison}
              notice={session.notice}
              busy={session.usageBusy}
              onShare={() => void session.share()}
              onReprice={
                session.portfolio.priceBook?.version !== session.estimate.catalogVersion
                  ? () => session.editPortfolio(repricePortfolio(session.portfolio))
                  : undefined
              }
            />
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <BudgetScenarioPanel session={session} />
        {session.portfolio.usage && <ActualUsageDetails usage={session.portfolio.usage} />}
        <Fold id="how-it-works" title="How we got this" open={howOpen} onOpenChange={onHowOpen}>
          <ul className="grid list-disc gap-2 pl-5 text-sm text-muted-foreground">
            {session.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Fold>
        <SavingsAside recommendations={session.recommendations} onApply={session.applyTip} />
        <CustomerNote />
      </div>
      {session.usagePreview && (
        <UsageReview
          preview={session.usagePreview}
          error={session.usageError}
          onApply={session.loadUsagePreview}
          onDismiss={session.dismissUsagePreview}
        />
      )}

      <MobileForecastBar annual={session.annual} incomplete={session.estimate.coverage?.complete === false} />
    </article>
  );
}

function Fold({
  id,
  title,
  open,
  onOpenChange,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Collapsible id={id} open={open} onOpenChange={onOpenChange} className="rounded-lg border bg-card shadow-sm">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/70">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
