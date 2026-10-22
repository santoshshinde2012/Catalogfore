import type { UnitCostCatalog, UnitCostRow } from "@cayfore/engine/unit-costs";
import { Braces, FileSpreadsheet, LoaderCircle, type LucideIcon } from "lucide-react";
import { useDeferredValue, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useReturnFocus } from "../../hooks/use-return-focus";
import { browserScheduler } from "../../services/browser-ports";
import { exportBusy, tableIsSettling } from "../../services/export-busy";
import { notices } from "../../services/notices";
import { rateDownload, rateExportJobs, type RateExportId } from "../../services/rate-exports";
import { showNotice } from "../../services/sonner-notifier";
import { RatesTableSkeleton } from "../loading/skeletons";
import { Button } from "../ui/button";
import { OptionSelect } from "../ui/option-select";
import { InfoTooltip } from "../ui/tooltip";
import { RateDataPreview } from "./RateDataPreview";
import { useRateDataTable, type RateDownloadDraft } from "./useRateDataTable";

const rateExportIcons: Record<RateExportId, LucideIcon> = { csv: FileSpreadsheet, json: Braces };

export function RateDownloads({
  catalog,
  rows,
  onInspect,
  draft,
  onDraft,
  filterKey,
}: {
  catalog: UnitCostCatalog;
  rows: UnitCostRow[];
  onInspect?: (row: UnitCostRow) => void;
  draft: RateDownloadDraft;
  onDraft: Dispatch<SetStateAction<RateDownloadDraft>>;
  filterKey: string;
}) {
  const { scope } = draft;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const focus = useRef<HTMLButtonElement>(null);
  useReturnFocus(Boolean(busy), focus);
  const sourceRows = scope === "all" ? catalog.rows : rows;
  const deferredRows = useDeferredValue(sourceRows);
  const tableLoading = tableIsSettling(sourceRows.length, deferredRows === sourceRows);
  const table = useRateDataTable(
    tableLoading ? deferredRows : sourceRows,
    draft,
    onDraft,
    scope === "all" ? "all" : filterKey,
  );
  const count = (value: number) => value.toLocaleString("en-US");
  async function download(format: RateExportId) {
    if (busy || tableLoading) return;
    const selected = table.orderedRows;
    let url: string | undefined;
    setBusy(format);
    setError("");
    try {
      await new Promise<void>((resolve) => {
        browserScheduler.frame(() => browserScheduler.frame(() => resolve()));
      });
      const file = rateDownload(format, catalog, selected, scope);
      url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setError("");
      showNotice(notices.exportReady(format.toUpperCase()));
    } catch {
      const message = "The rate file could not be downloaded. Try again.";
      setError(message);
      showNotice(notices.problem(message));
    } finally {
      if (url) URL.revokeObjectURL(url);
      setBusy("");
    }
  }
  return (
    <section
      aria-label="Download unit costs"
      aria-busy={Boolean(busy) || tableLoading}
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0 basis-full lg:max-w-md lg:basis-auto lg:pb-1">
          <h2 className="text-base font-semibold tracking-tight">Explore the price catalog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Catalog {catalog.catalogVersion} · Monetary prices in USD
          </p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <OptionSelect
            className="min-w-0 grow basis-full sm:w-72 sm:grow-0 sm:basis-auto"
            label="Download scope"
            value={scope}
            disabled={Boolean(busy)}
            onValueChange={(value) =>
              onDraft((current) => ({ ...current, scope: value === "all" ? "all" : "filtered", page: 0 }))
            }
            options={[
              { value: "filtered", label: `Filtered rows (${count(rows.length)})` },
              { value: "all", label: `Complete catalog (${count(catalog.rows.length)})` },
            ]}
          />
          <div role="group" aria-label="Export format" className="flex gap-2">
            {rateExportJobs.map((job) => {
              const state = exportBusy(busy, job);
              const Icon = rateExportIcons[job.id];
              return (
                <InfoTooltip key={job.id} label={`Download ${job.label}`} description={job.hint}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-[6.5rem] justify-start px-3 sm:h-10"
                    aria-label={state.active ? `Preparing ${job.label}` : job.label}
                    aria-busy={state.active}
                    onClick={(event) => {
                      focus.current = event.currentTarget;
                      void download(job.id);
                    }}
                    disabled={state.disabled || tableLoading}
                  >
                    {state.active ? (
                      <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Icon aria-hidden="true" />
                    )}
                    {state.label}
                  </Button>
                </InfoTooltip>
              );
            })}
          </div>
        </div>
      </div>
      <p
        id="rate-preview-help"
        className="px-4 pt-3 pb-4 text-xs leading-relaxed text-muted-foreground sm:px-5"
        role={busy ? "status" : undefined}
      >
        {busy
          ? "Preparing your rate file…"
          : `${scope === "all" ? "Preview and export include all catalog rows, regardless of filters" : "Preview and export include all filtered rows, beyond this page"}; exports retain 40 fields and unavailable prices stay empty. Compare like-for-like billing units${onInspect ? "; select a product for details" : ""}.`}
      </p>
      {error && (
        <p className="px-4 pb-4 text-xs text-destructive sm:px-5" role="alert">
          {error}
        </p>
      )}
      {tableLoading ? <RatesTableSkeleton /> : <RateDataPreview table={table} onInspect={onInspect} />}
    </section>
  );
}
