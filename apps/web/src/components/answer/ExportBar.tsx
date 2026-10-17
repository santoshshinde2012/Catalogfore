import type { Estimate, ForecastPoint, Portfolio } from "@cayfore/engine";
import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { forecastExporters, type ForecastDownload } from "../../export";
import type { ForecastExportResult } from "../../export-data";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { InfoTooltip } from "../ui/tooltip";

export function ExportBar({
  portfolio,
  estimate,
  points,
  forecastResult,
}: {
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  forecastResult?: ForecastExportResult;
}) {
  const [busy, setBusy] = useState("");
  const [downloadError, setDownloadError] = useState("");

  async function run(exporter: ForecastDownload) {
    if (!exporter.failure) {
      await exporter.write(portfolio, estimate, points, forecastResult);
      return;
    }
    setBusy(exporter.id);
    setDownloadError("");
    try {
      await exporter.write(portfolio, estimate, points, forecastResult);
    } catch {
      setDownloadError(exporter.failure);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <InfoTooltip
          label="Download your forecast"
          description="Export an Excel workbook, CSV spreadsheet, JSON data, or a PDF report."
          align="end"
        >
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline">
              <Download aria-hidden="true" />
              Export
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </InfoTooltip>
        <DropdownMenuContent align="end" regionLabel="Forecast export" className="w-72 rounded-2xl p-1.5">
          <div className="mb-1 border-b px-2.5 pt-2 pb-3" aria-hidden="true">
            <p className="text-sm font-semibold">Download forecast</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose a format for your forecast.</p>
          </div>
          {forecastExporters.map((exporter) => {
            const Icon = exporter.icon;
            return (
              <DropdownMenuItem
                key={exporter.id}
                className="gap-3 rounded-xl px-2.5 py-2.5"
                onSelect={() => void run(exporter)}
                disabled={Boolean(exporter.busyLabel) && busy === exporter.id}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {busy === exporter.id && exporter.busyLabel ? exporter.busyLabel : exporter.menuLabel}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{exporter.detail}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {downloadError && (
        <p role="alert" className="w-full text-sm text-destructive">
          {downloadError}
        </p>
      )}
    </>
  );
}
