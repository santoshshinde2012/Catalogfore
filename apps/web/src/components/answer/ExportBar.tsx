import type { Estimate, ForecastPoint, Portfolio } from "@cayfore/engine";
import { ChevronDown, Download, FileJson2, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { exportCsv, exportJson, exportPdf, exportXlsx } from "../../export";
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

  async function downloadFile(kind: "pdf" | "xlsx") {
    setBusy(kind);
    setDownloadError("");
    try {
      if (kind === "xlsx") await exportXlsx(portfolio, estimate, points, forecastResult);
      else await exportPdf(portfolio, estimate, points, forecastResult);
    } catch {
      setDownloadError(
        kind === "xlsx"
          ? "The Excel file did not download. Try again, or use CSV."
          : "The PDF did not download. Try again, or use CSV.",
      );
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
          <DropdownMenuItem
            className="gap-3 rounded-xl px-2.5 py-2.5"
            onSelect={() => void downloadFile("xlsx")}
            disabled={busy === "xlsx"}
          >
            <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-medium">{busy === "xlsx" ? "Preparing Excel…" : "XLSX"}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Excel workbook with formulas, rates, and sources
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-2.5 py-2.5"
            onSelect={() => exportCsv(portfolio, estimate, points, forecastResult)}
          >
            <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-medium">CSV</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Costs and monthly forecasts for spreadsheets
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-2.5 py-2.5"
            onSelect={() => exportJson(portfolio, estimate, points, forecastResult)}
          >
            <FileJson2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-medium">JSON</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Complete forecast data and assumptions</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-2.5 py-2.5"
            onSelect={() => void downloadFile("pdf")}
            disabled={busy === "pdf"}
          >
            <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-medium">{busy === "pdf" ? "Preparing PDF…" : "PDF"}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Shareable report with costs and assumptions
              </span>
            </span>
          </DropdownMenuItem>
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
