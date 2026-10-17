import { ChevronDown, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { UsageExportGuide } from "./UsageExportGuide";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

export function UsagePanel({
  busy,
  error,
  onFile,
  onSample,
  onHistorySample,
}: {
  busy: boolean;
  error: string;
  onFile: (file: File) => void;
  onSample: () => void;
  onHistorySample: () => void;
}) {
  return (
    <Collapsible className="rounded-lg border bg-muted/30">
      <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-muted">
        <span className="flex items-center gap-2.5">
          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
          Use my real usage
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Start from a Databricks billing or FOCUS CSV. You’ll review the month, known costs, and pricing gaps before
          applying anything.
        </p>
        <div className="mt-4" aria-busy={busy}>
          <Button
            type="button"
            asChild
            className="w-full cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          >
            <label aria-disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {busy ? "Reading…" : "Choose CSV"}
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                aria-label="Usage CSV"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onFile(file);
                }}
              />
            </label>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground" role={busy ? "status" : undefined}>
            {busy
              ? "Reading your CSV and checking its pricing coverage…"
              : "Processed in this browser. No credentials needed."}
          </p>
        </div>
        {error && (
          <p
            className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <UsageExportGuide />
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Explore first with demonstration data</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onSample} disabled={busy}>
              Load a sample
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onHistorySample} disabled={busy}>
              Load history sample
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
