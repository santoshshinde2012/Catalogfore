import { unitCostCsv, unitCostJson, type UnitCostCatalog, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { Braces, FileSpreadsheet, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { APP_NAME } from "../../site";
import { Button } from "../ui/button";
import { OptionSelect } from "../ui/option-select";
import { InfoTooltip } from "../ui/tooltip";
import { RateDataPreview } from "./RateDataPreview";
import { useRateDataTable } from "./useRateDataTable";

const formats = [
  { id: "csv", label: "CSV", icon: FileSpreadsheet, hint: "Spreadsheet of the selected rows" },
  { id: "json", label: "JSON", icon: Braces, hint: "Catalog file with the same rows" },
] as const;

export function RateDownloads({
  catalog,
  rows,
  onInspect,
}: {
  catalog: UnitCostCatalog;
  rows: UnitCostRow[];
  onInspect?: (row: UnitCostRow) => void;
}) {
  const [scope, setScope] = useState("filtered");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const table = useRateDataTable(scope === "all" ? catalog.rows : rows);
  const count = (value: number) => value.toLocaleString("en-US");
  async function download(format: "csv" | "json") {
    const selected = table.orderedRows;
    let url: string | undefined;
    setBusy(format);
    setError("");
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const body = format === "csv" ? unitCostCsv(selected) : unitCostJson(catalog, selected);
      url = URL.createObjectURL(
        new Blob([body], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${APP_NAME.toLowerCase()}-unit-costs-${scope}.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setError("");
    } catch {
      setError("The rate file could not be downloaded. Try again.");
    } finally {
      if (url) URL.revokeObjectURL(url);
      setBusy("");
    }
  }
  return (
    <section aria-label="Download unit costs" className="min-w-0 overflow-hidden rounded-xl border bg-card">
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
            onValueChange={setScope}
            options={[
              { value: "filtered", label: `Filtered rows (${count(rows.length)})` },
              { value: "all", label: `Complete catalog (${count(catalog.rows.length)})` },
            ]}
          />
          <div role="group" aria-label="Export format" className="flex gap-2">
            {formats.map(({ id, label, icon: Icon, hint }) => {
              const preparing = busy === id;
              return (
                <InfoTooltip key={id} label={`Download ${label}`} description={hint}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-[6.5rem] justify-start px-3 sm:h-10"
                    aria-label={preparing ? `Preparing ${label}` : label}
                    onClick={() => void download(id)}
                    disabled={Boolean(busy)}
                  >
                    {preparing ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Icon aria-hidden="true" />
                    )}
                    {preparing ? "Preparing…" : label}
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
      <RateDataPreview table={table} onInspect={onInspect} />
    </section>
  );
}
