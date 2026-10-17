import { selectUsageMonth, type UsageImportPreview } from "@cayfore/engine";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { UsageImportSummary } from "./UsageImportSummary";
import { UsageOwnership } from "./UsageOwnership";
import { UsageProductsTable } from "./UsageProductsTable";

export function UsageReview({
  preview,
  error,
  onApply,
  onDismiss,
}: {
  preview: UsageImportPreview;
  error: string;
  onApply: (preview: UsageImportPreview, mode: "replace" | "append") => void;
  onDismiss: () => void;
}) {
  const [month, setMonth] = useState(preview.selectedMonth ?? "");
  const [append, setAppend] = useState(false);
  useEffect(() => {
    setMonth(preview.selectedMonth ?? "");
    setAppend(false);
  }, [preview]);
  const selected = useMemo(() => (month ? selectUsageMonth(preview, month) : preview), [preview, month]);
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <SheetContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <SheetTitle>Review usage import</SheetTitle>
          <SheetDescription>
            Confirm the month and pricing coverage before applying this billing snapshot to your forecast.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {selected.availableMonths.length > 0 ? (
            <label className="field">
              Baseline month
              <select
                aria-label="Import baseline month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                {!month && <option value="">Select a month</option>}
                {selected.availableMonths.map((period) => (
                  <option key={period} value={period}>
                    {period}
                    {selected.completeMonths.includes(period)
                      ? " · closed calendar month"
                      : " · partial observed month"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              No dated month is available. Only the observed rows in this export can be used.
            </p>
          )}
          <UsageImportSummary preview={selected} />
          <UsageProductsTable preview={selected} />
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Ownership in this export</summary>
            <div className="mt-3">
              <UsageOwnership rows={selected.attribution} />
            </div>
          </details>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold">How to apply this import</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              By default, this replaces the current workloads and dated changes. The forecast starts after the selected
              baseline month. Choose append only when this file covers separate workloads.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={append}
                onChange={(event) => setAppend(event.target.checked)}
              />
              <span>
                Append to the current plan instead of replacing its baseline
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Existing workloads remain. Overlapping imported sources are rejected.
                </span>
              </span>
            </label>
          </div>
        </div>
        <div className="shrink-0 border-t bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {error && (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!selected.usedRows && (
            <p className="mb-3 text-xs text-muted-foreground">Select a month with valid usage rows to continue.</p>
          )}
          <p id="usage-apply-summary" className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {append
              ? "Adds imported workloads to your existing plan."
              : "Replaces current workloads and dated changes."}{" "}
            You can undo after applying.
          </p>
          <div className="flex flex-col gap-2 min-[380px]:flex-row">
            <Button
              type="button"
              className="min-h-11 flex-1"
              aria-describedby="usage-apply-summary"
              disabled={!selected.usedRows}
              onClick={() => onApply(selected, append ? "append" : "replace")}
            >
              {append ? "Append usage to plan" : "Use this baseline"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={onDismiss}>
              Cancel import
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
