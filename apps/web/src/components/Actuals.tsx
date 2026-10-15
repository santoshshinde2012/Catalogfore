import { estimate, importUsageCsv, scaleForActuals, type Portfolio, type UsageImport } from "@dcf/engine";
import { useState } from "react";
import { money } from "../format";

interface ActualsProps {
  portfolio: Portfolio;
  onPortfolio: (portfolio: Portfolio) => void;
}

export function Actuals({ portfolio, onPortfolio }: ActualsProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<UsageImport | null>(null);
  const [error, setError] = useState("");
  const steady = { ...portfolio, usageScale: 1 };
  const baseline = estimate(steady);

  function read(csv: string) {
    setText(csv);
    const result = importUsageCsv(csv);
    setParsed(result);
    setError(result.usedRows ? "" : "That file did not contain DBU rows.");
  }

  async function loadSample() {
    const response = await fetch(`${import.meta.env.BASE_URL}sample-usage.csv`);
    read(await response.text());
  }

  const scale = parsed && parsed.dbu > 0 ? scaleForActuals(baseline.dbu, parsed.dbu) : 1;

  return (
    <div className="stage">
      <h1 className="h2">Calibrate from a bill</h1>
      <p className="lede mb-6">
        Export <code>system.billing.usage</code> to CSV. Retractions are already negative and are netted. Storage and token rows are skipped. The scale multiplies every line so this month’s DBUs match the file. Cloud dollars move with them, because the usage table has no VM bill.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <label className="btn">
          Choose CSV
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) read(await file.text());
            }}
          />
        </label>
        <button type="button" className="btn" onClick={() => void loadSample()}>
          Load sample
        </button>
        <button type="button" className="btn" onClick={() => onPortfolio({ ...portfolio, usageScale: 1 })}>
          Clear scale ({portfolio.usageScale.toFixed(2)}×)
        </button>
      </div>
      <label className="field mb-3">
        Or paste CSV
        <textarea rows={6} value={text} onChange={(event) => read(event.target.value)} />
      </label>
      {error && <p className="tip warn">{error}</p>}
      {parsed && parsed.usedRows > 0 && (
        <div className="panel p-4">
          <p>
            Imported <strong>{parsed.dbu.toLocaleString()} DBU</strong> across {parsed.usedRows} rows. This portfolio’s unscaled month is{" "}
            <strong>{baseline.dbu.toLocaleString()} DBU</strong> ({money(baseline.total)}).
          </p>
          <table className="lines">
            <thead>
              <tr>
                <th>Mapped SKU</th>
                <th>DBU</th>
              </tr>
            </thead>
            <tbody>
              {parsed.bySku.map((row) => (
                <tr key={row.sku}>
                  <td>{row.sku}</td>
                  <td className="num">{row.dbu.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.warnings.map((warning) => (
            <p key={warning} className="hint">{warning}</p>
          ))}
          <button type="button" className="btn-copper mt-3" onClick={() => onPortfolio({ ...portfolio, usageScale: scale })}>
            Scale forecast to {scale.toFixed(3)}×
          </button>
        </div>
      )}
    </div>
  );
}
