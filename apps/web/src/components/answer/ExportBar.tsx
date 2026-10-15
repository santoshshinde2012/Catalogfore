import type { Estimate, ForecastPoint, Portfolio } from "@dcf/engine";
import { useState } from "react";
import { exportCsv, exportJson, exportPdf } from "../../export";

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
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => exportCsv(portfolio, estimate, points)}>
          CSV
        </button>
        <button type="button" className="btn" onClick={() => exportJson(portfolio, estimate, points)}>
          JSON
        </button>
        <button type="button" className="btn" onClick={() => void downloadPdf()} disabled={pdfBusy} aria-busy={pdfBusy}>
          {pdfBusy ? "Preparing PDF…" : "PDF"}
        </button>
      </div>
      {pdfError && <p className="tip warn">{pdfError}</p>}
    </>
  );
}
