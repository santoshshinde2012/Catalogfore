import { ChevronDown, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { UsageExportGuide } from "./UsageExportGuide";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

export function UsagePanel({
  busy,
  progress = null,
  error,
  onFile,
  onSample,
  onHistorySample,
}: {
  busy: boolean;
  progress?: number | null;
  error: string;
  onFile: (file: File) => void;
  onSample: () => void;
  onHistorySample: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sampleKind, setSampleKind] = useState<"current" | "history" | null>(null);
  const percent = progress == null ? null : Math.max(0, Math.min(100, Math.round(progress)));
  const status = busy
    ? percent == null
      ? "Reading your CSV and checking its pricing coverage…"
      : `Reading your CSV, ${percent}%`
    : "Processed in this browser. No credentials needed.";
  return (
    <Collapsible className="contents">
      <CollapsibleTrigger
        data-usage-import-return
        className="group order-1 flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium whitespace-normal hover:bg-muted"
      >
        <span className="flex items-center gap-2.5">
          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
          Use my real usage
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="plan-usage-panel order-3 col-span-2 px-2.5 pt-2 pb-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Start from a Databricks billing or FOCUS CSV. You’ll review the month, known costs, and pricing gaps before
          applying anything.
        </p>
        <div className="mt-4" aria-busy={busy} aria-live="polite">
          <Button
            type="button"
            asChild
            className="w-full cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          >
            <label aria-disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {busy ? "Reading…" : "Choose CSV"}
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                aria-label="Usage CSV"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setSampleKind(null);
                  onFile(file);
                }}
              />
            </label>
          </Button>
          {busy && percent != null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${percent}%` }} />
            </div>
          )}
          {busy && percent == null && <div className="skeleton mt-3 h-1.5 rounded-full" aria-hidden="true" />}
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {status}
          </p>
        </div>
        {error && (
          <div
            className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (sampleKind === "history") onHistorySample();
                else if (sampleKind === "current") onSample();
                else fileRef.current?.click();
              }}
            >
              {sampleKind ? "Try again" : "Choose another file"}
            </Button>
          </div>
        )}
        <UsageExportGuide />
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Explore first with demonstration data</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setSampleKind("current");
                onSample();
              }}
            >
              Load a sample
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setSampleKind("history");
                onHistorySample();
              }}
            >
              Load history sample
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
