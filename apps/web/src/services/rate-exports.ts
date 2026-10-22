import { unitCostCsv, unitCostJson, type UnitCostCatalog, type UnitCostRow } from "@cayfore/engine/unit-costs";
import type { ExportJob } from "./export-busy";
import { APP_NAME } from "../site";

interface RateExportJob extends ExportJob {
  hint: string;
  mediaType: string;
  body: (catalog: UnitCostCatalog, rows: UnitCostRow[]) => string;
}

export const rateExportJobs: readonly RateExportJob[] = [
  {
    id: "csv",
    label: "CSV",
    hint: "Spreadsheet of the selected rows",
    mediaType: "text/csv;charset=utf-8",
    body: (_catalog, rows) => unitCostCsv(rows),
  },
  {
    id: "json",
    label: "JSON",
    hint: "Catalog file with the same rows",
    mediaType: "application/json",
    body: (catalog, rows) => unitCostJson(catalog, rows),
  },
];

export type RateExportId = (typeof rateExportJobs)[number]["id"];

const jobs = Object.fromEntries(rateExportJobs.map((job) => [job.id, job])) as Record<RateExportId, RateExportJob>;

export function rateDownload(id: RateExportId, catalog: UnitCostCatalog, rows: UnitCostRow[], scope: string) {
  const job = jobs[id];
  return {
    filename: `${APP_NAME.toLowerCase()}-unit-costs-${scope}.${id}`,
    blob: new Blob([job.body(catalog, rows)], { type: job.mediaType }),
  };
}
