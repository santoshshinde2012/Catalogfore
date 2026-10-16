import type { Estimate, ForecastPoint, Portfolio } from "@dcf/engine";
import { useState } from "react";
import { exportCsv, exportJson, exportPdf } from "../../export";
import { Button } from "../ui/button";

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
      <Button type="button" variant="outline" onClick={() => exportCsv(portfolio, estimate, points)}>
        CSV
      </Button>
      <Button type="button" variant="outline" onClick={() => exportJson(portfolio, estimate, points)}>
        JSON
      </Button>
      <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={pdfBusy} aria-busy={pdfBusy}>
        {pdfBusy ? "Preparing PDF…" : "PDF"}
      </Button>
      {pdfError && <p className="w-full text-sm text-destructive">{pdfError}</p>}
    </>
  );
}
