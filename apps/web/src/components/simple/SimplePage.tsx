import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { SimpleSession } from "../../hooks/useSimpleForecast";
import { Card } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { AdvancedBuilder } from "./AdvancedBuilder";
import { CustomerNote } from "./CustomerNote";
import { ResultsPanel } from "./ForecastOutcome";
import { PlanForm } from "./PlanForm";
import { SavingsAside } from "./SavingsAside";
import { UsagePanel } from "./UsagePanel";

export function SimplePage({ session }: { session: SimpleSession }) {
  return (
    <article className="mx-auto w-full max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:pb-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          What does the next year cost?
        </h1>
        <p className="mt-3 text-base text-muted-foreground text-pretty sm:text-lg">
          A 12-month range from four inputs. For a team that is evaluating, new, or writing a budget.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card className="p-6 shadow-sm">
          {session.usingDetail && (
            <p className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
              The detailed workloads are driving this forecast. Change an input below to go back to the four-input
              model.
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
          <div className="mt-6 grid gap-3 border-t pt-6">
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
          </div>
        </Card>

        <div className="lg:sticky lg:top-16">
          <Card className="p-6 shadow-[0_1px_2px_rgb(11_32_38/0.04),0_12px_32px_rgb(11_32_38/0.06)]">
            <ResultsPanel
              annual={session.annual}
              spreadPercent={session.spreadPercent}
              cloudShare={session.cloudShare}
              firstMonth={session.months[0]?.expected ?? 0}
              months={session.months}
              portfolio={session.portfolio}
              estimate={session.estimate}
              points={session.points}
              notice={session.notice}
              busy={session.usageBusy}
              onShare={() => void session.share()}
            />
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <Fold title="How we got this">
          <ul className="grid list-disc gap-2 pl-5 text-sm text-muted-foreground">
            {session.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Fold>
        <SavingsAside recommendations={session.recommendations} onApply={session.applyTip} />
        <CustomerNote />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-3">
          <p className="text-xs text-muted-foreground">Next year</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatSticky(session.annual)}
            <span className="ml-2 text-sm font-medium text-muted-foreground">±{session.spreadPercent}%</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible className="rounded-lg border bg-card shadow-sm">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/70">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function formatSticky(annual: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    annual,
  );
}
