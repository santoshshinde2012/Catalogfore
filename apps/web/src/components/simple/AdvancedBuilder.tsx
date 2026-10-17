import type { Estimate, Portfolio } from "@cayfore/engine";
import { ChevronRight, LoaderCircle } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

const Ledger = lazy(() => import("../Ledger").then((module) => ({ default: module.Ledger })));

export function AdvancedBuilder({
  ask = 0,
  portfolio,
  estimate,
  selectedId,
  onPortfolio,
  onSelect,
  onRemove,
  onUsageFile,
}: {
  ask?: number;
  portfolio: Portfolio;
  estimate: Estimate;
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onUsageFile: (file: File) => void;
}) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (ask > 0) setOpened(true);
  }, [ask]);
  return (
    <Sheet open={opened} onOpenChange={setOpened}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" className="h-auto w-full justify-between px-2 py-2 font-medium">
          Advanced
          <ChevronRight className="size-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Advanced</SheetTitle>
          <SheetDescription>
            The same forecast, one workload at a time. Global growth and pricing controls preserve these workloads.
          </SheetDescription>
        </SheetHeader>
        <Suspense
          fallback={
            <p className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading workload editor…
            </p>
          }
        >
          <Ledger
            portfolio={portfolio}
            estimate={estimate}
            selectedId={selectedId}
            onPortfolio={onPortfolio}
            onSelect={onSelect}
            onRemove={onRemove}
            onUsageFile={onUsageFile}
          />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
