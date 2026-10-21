import type { Portfolio, SimplePlan, UsageImportPreview } from "@cayfore/engine";
import type { SessionControls } from "./session-controls";

/** The fields a reset or import replaces. Undo writes this object back unchanged. */
export interface ForecastSnapshot {
  plan: SimplePlan;
  portfolio: Portfolio;
  override: Portfolio | null;
  undo: Portfolio | null;
  selectedId: string | null;
  notice: string;
  usageError: string;
  usagePreview: UsageImportPreview | null;
}

export function captureForecast(controls: SessionControls): ForecastSnapshot {
  return {
    plan: controls.plan,
    portfolio: controls.portfolio,
    override: controls.override,
    undo: controls.undo,
    selectedId: controls.selectedId,
    notice: controls.notice,
    usageError: controls.usageError,
    usagePreview: controls.usagePreview,
  };
}

export function restoreForecast(controls: SessionControls, snapshot: ForecastSnapshot) {
  controls.loadRequest.current += 1;
  controls.setUsageBusy(false);
  controls.setUsageProgress(null);
  controls.setPlan(snapshot.plan);
  controls.setUndo(snapshot.undo);
  controls.setOverride(snapshot.override ?? snapshot.portfolio);
  controls.setSelectedId(snapshot.selectedId);
  controls.setUsagePreview(snapshot.usagePreview);
  controls.setUsageError(snapshot.usageError);
  controls.setNotice(snapshot.notice);
}
