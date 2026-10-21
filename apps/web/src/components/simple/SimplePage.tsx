import { ChevronDown } from "lucide-react";
import { projectPortfolio, repricePortfolio } from "@cayfore/engine";
import { useMemo, type ReactNode } from "react";
import type { SimpleSession } from "../../hooks/useSimpleForecast";
import type { RatePlacement } from "../../hooks/useAppView";
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
  onReferenceCosts,
}: {
  session: SimpleSession;
  howOpen: boolean;
  onHowOpen: (open: boolean) => void;
  advancedAsk: number;
  onReferenceCosts?: (productId: string, placement: RatePlacement) => void;
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
    <article className="mx-auto w-full max-w-7xl px-4 pt-4 pb-10 sm:px-6 lg:pt-5 lg:pb-16">
      <header className="max-w-3xl">
        <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Databricks cost planner
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          What does the next year cost?
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Set cloud, starting spend, workload mix, and monthly growth. The year updates as you go.
        </p>
      </header>
      {session.canUndo && (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={session.undoRemove}>
          Undo last change
        </Button>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card id="plan-inputs" tabIndex={-1} aria-labelledby="inputs-heading" className="min-w-0 p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b pb-3">
            <div className="min-w-0">
              <h2 id="inputs-heading" className="text-lg font-semibold">
                Plan inputs
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {session.usingUsage || session.usingDetail
                  ? "Cloud sets defaults for new products. Growth still applies to this baseline."
                  : "1 Cloud · 2 Starting spend · 3 Mix · 4 Monthly growth"}
              </p>
            </div>
            <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {session.usingUsage ? "Imported baseline" : session.usingDetail ? "By product" : "Quick estimate"}
            </span>
          </div>
          <div className="plan-start mb-3 grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/15 p-1.5">
            <UsagePanel
              busy={session.usageBusy}
              progress={session.usageProgress}
              error={session.usageError}
              onFile={session.loadUsageFile}
              onSample={session.loadSample}
              onHistorySample={() => session.loadSample("history")}
            />
            <AdvancedBuilder
              ask={advancedAsk}
              portfolio={session.portfolio}
              estimate={session.estimate}
              hasUnpriced={session.forecastResult.hasUnpriced}
              selectedId={session.selectedId}
              onPortfolio={session.editPortfolio}
              onSelect={session.selectWorkload}
              onRemove={session.removeWorkload}
              onUsageFile={session.loadUsageFile}
              usageError={session.usageError}
              usageBusy={session.usageBusy}
              usageProgress={session.usageProgress}
            />
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
            source={session.portfolio}
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
        </Card>

        <div className="min-w-0 lg:sticky lg:top-[calc(var(--workspace-header-height)+1rem)]">
          <Card
            role="region"
            aria-label="Forecast results"
            tabIndex={0}
            className="p-4 shadow-[0_1px_2px_rgb(11_32_38/0.04),0_12px_32px_rgb(11_32_38/0.06)] sm:p-5 lg:max-h-[calc(100svh-var(--workspace-header-height)-2rem)] lg:overflow-y-auto lg:overscroll-contain"
          >
            <ResultsPanel
              projection={session.forecastResult}
              onReferenceCosts={onReferenceCosts}
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

      <MobileForecastBar annual={session.annual} incomplete={session.forecastResult.hasUnpriced} />
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
