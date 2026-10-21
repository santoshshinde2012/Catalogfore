export const BUSY_LABEL = "Preparing…";
export const LARGE_TABLE_ROWS = 500;

export interface ExportJob {
  id: string;
  label: string;
  busyLabel?: string;
}

export interface ExportBusyState {
  active: boolean;
  disabled: boolean;
  label: string;
}

/** How one registered export looks while any export in the group is running. */
export function exportBusy(activeId: string, job: ExportJob): ExportBusyState {
  const active = activeId === job.id;
  return { active, disabled: activeId !== "", label: active ? (job.busyLabel ?? BUSY_LABEL) : job.label };
}

export function activeBusyLabel(jobs: readonly { id: string; busyLabel?: string }[], activeId: string): string {
  const job = jobs.find((item) => item.id === activeId);
  return job ? (job.busyLabel ?? BUSY_LABEL) : "";
}

export function tableIsSettling(sourceLength: number, deferredIsSource: boolean): boolean {
  return sourceLength > LARGE_TABLE_ROWS && !deferredIsSource;
}
