import type { Estimate, ForecastPoint, Portfolio } from "@cayfore/engine";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { exportCsv, exportJson, exportPdf } from "../../export";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

export function ExportBar({
  portfolio,
  estimate,
  points,
}: {
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  async function downloadPdf() {
    setPdfBusy(true);
    setPdfError("");
    try {
      await exportPdf(portfolio, estimate, points);
    } catch {
      setPdfError("The PDF did not download. Try again, or use CSV.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            Export
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => exportCsv(portfolio, estimate, points)}>CSV</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportJson(portfolio, estimate, points)}>JSON</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void downloadPdf()} disabled={pdfBusy}>
            {pdfBusy ? "Preparing PDF…" : "PDF"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {pdfError && <p className="w-full text-sm text-destructive">{pdfError}</p>}
    </>
  );
}
