import { useState } from "react";
import usageSql from "../../../../../docs/usage-export.sql?raw";
import { Button } from "../ui/button";

export function UsageExportGuide() {
  const [notice, setNotice] = useState("");
  async function copySql() {
    try {
      await navigator.clipboard.writeText(usageSql);
      setNotice("SQL copied. Run it in your Databricks SQL editor, then download the result as CSV.");
    } catch {
      setNotice("Clipboard access is unavailable. Select and copy the SQL shown above.");
    }
  }
  return (
    <details className="mt-4 rounded-lg border bg-card p-3">
      <summary className="cursor-pointer text-sm font-medium">Get the export SQL</summary>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Copy this read-only query into your Databricks SQL editor. Run it with access to
        <code className="mx-1 font-mono">system.billing</code>, then download the results as CSV and choose that file
        above. Your workspace credentials stay in your own tools.
      </p>
      <pre
        className="mt-3 max-h-56 overflow-auto whitespace-pre rounded-md bg-muted p-3 text-[11px]"
        tabIndex={0}
        role="region"
        aria-label="Usage export SQL"
      >
        <code>{usageSql}</code>
      </pre>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void copySql()}>
        Copy export SQL
      </Button>
      {notice && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {notice}
        </p>
      )}
    </details>
  );
}
