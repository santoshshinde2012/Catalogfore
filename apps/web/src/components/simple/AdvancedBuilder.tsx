import type { Estimate, Portfolio } from "@cayfore/engine";
import { ChevronRight } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { AdvancedSkeleton } from "../loading/skeletons";
import { loadLedger, prefetch } from "../loading/route-loaders";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

const Ledger = lazy(() => loadLedger().then((module) => ({ default: module.Ledger })));

export function AdvancedBuilder({
  ask = 0,
  portfolio,
  estimate,
  hasUnpriced,
  selectedId,
  onPortfolio,
  onSelect,
  onRemove,
  onUsageFile,
  usageError = "",
  usageBusy = false,
  usageProgress = null,
}: {
  ask?: number;
  portfolio: Portfolio;
  estimate: Estimate;
  hasUnpriced?: boolean;
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onUsageFile: (file: File) => void;
  usageError?: string;
  usageBusy?: boolean;
  usageProgress?: number | null;
}) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (ask > 0) setOpened(true);
  }, [ask]);
  return (
    <Sheet
      open={opened}
      onOpenChange={(open) => {
        if (!open && document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
        setOpened(open);
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="order-2 h-auto min-h-11 w-full min-w-0 justify-between px-2.5 py-2 font-medium whitespace-normal"
          onMouseEnter={() => prefetch.warm("advanced")}
          onFocus={() => prefetch.warm("advanced")}
        >
          Advanced
          <ChevronRight className="size-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Advanced</SheetTitle>
          <SheetDescription>
            The same forecast, one workload at a time. Global growth and pricing controls preserve these workloads.
            Numbers and names apply on Enter or when you leave the field.
          </SheetDescription>
        </SheetHeader>
        {usageBusy && (
          <p role="status" className="text-sm text-muted-foreground">
            {usageProgress == null
              ? "Reading your CSV and checking its pricing coverage…"
              : `Reading your CSV, ${usageProgress}%`}
          </p>
        )}
        {usageError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {usageError}
          </p>
        )}
        <Suspense fallback={<AdvancedSkeleton />}>
          <Ledger
            portfolio={portfolio}
            estimate={estimate}
            hasUnpriced={hasUnpriced}
            selectedId={selectedId}
            onPortfolio={onPortfolio}
            onSelect={onSelect}
            onRemove={onRemove}
            onUsageFile={onUsageFile}
            usageBusy={usageBusy}
          />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
