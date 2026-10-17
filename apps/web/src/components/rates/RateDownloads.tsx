import { unitCostCsv, unitCostJson, type UnitCostCatalog, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { InfoTooltip } from "../ui/tooltip";

export function RateDownloads({ catalog, rows }: { catalog: UnitCostCatalog; rows: UnitCostRow[] }) {
  const [scope, setScope] = useState("filtered");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function download(format: "csv" | "json") {
    const selected = scope === "all" ? catalog.rows : rows;
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
    <section aria-label="Download unit costs" className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="field min-w-0 grow">
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
              className="min-h-11"
              onClick={() => void download(format)}
              disabled={Boolean(busy)}
            >
              <Download aria-hidden="true" />
              {busy === format ? `Preparing ${format.toUpperCase()}…` : format.toUpperCase()}
            </Button>
          </InfoTooltip>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground" role={busy ? "status" : undefined}>
        {busy
          ? "Preparing your rate file…"
          : "Use filtered rows for a smaller file, or download every catalog dimension."}
      </p>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
