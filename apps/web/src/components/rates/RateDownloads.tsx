import { unitCostCsv, unitCostJson, type UnitCostCatalog, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { InfoTooltip } from "../ui/tooltip";
import { RateDataPreview } from "./RateDataPreview";
import { useRateDataTable } from "./useRateDataTable";

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
      anchor.download = `cayfore-unit-costs-${scope}.${format}`;
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
      <div className="flex flex-wrap items-end gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0 basis-full lg:grow lg:basis-0 lg:pb-1 lg:pr-3">
          <h2 className="text-base font-semibold tracking-tight">Explore the price catalog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Catalog {catalog.catalogVersion} · Monetary prices in USD
          </p>
        </div>
        <label className="field min-w-0 grow basis-full sm:basis-64 lg:w-70 lg:grow-0 lg:basis-auto">
          Download scope
          <select value={scope} onChange={(event) => setScope(event.target.value)} disabled={Boolean(busy)}>
            <option value="filtered">Filtered rows ({rows.length.toLocaleString("en-US")})</option>
            <option value="all">Complete catalog ({catalog.rows.length.toLocaleString("en-US")})</option>
          </select>
        </label>
        {(["csv", "json"] as const).map((format) => (
          <InfoTooltip
            key={format}
            label={`Download ${format.toUpperCase()}`}
            description="Includes unit prices, dimensions, formulas, evidence, and source URLs. Empty prices remain unresolved."
          >
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-md"
              onClick={() => void download(format)}
              disabled={Boolean(busy)}
            >
              <Download aria-hidden="true" />
              {busy === format ? `Preparing ${format.toUpperCase()}…` : format.toUpperCase()}
            </Button>
          </InfoTooltip>
        ))}
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
