export function UsagePanel({
  busy,
  error,
  onFile,
  onSample,
}: {
  busy: boolean;
  error: string;
  onFile: (file: File) => void;
  onSample: () => void;
}) {
  return (
    <details className="fold">
      <summary>Use my real usage</summary>
      <p className="hint">
        Upload a <code>system.billing.usage</code> CSV. It replaces the monthly spend and the mix. Growth, cloud, and
        discount stay as you set them.
      </p>
      <div className="row-actions">
        <label className="btn">
          {busy ? "Reading…" : "Choose CSV"}
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            aria-label="Usage CSV"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        </label>
        <button type="button" className="btn" onClick={onSample} disabled={busy}>
          Load a sample
        </button>
      </div>
      {error && (
        <p className="tip warn" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
