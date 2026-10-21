import type { Portfolio, SimplePlan, UsageImportPreview } from "@cayfore/engine";
import type { Theme } from "./forecast-session";

export interface SessionControls {
  plan: SimplePlan;
  portfolio: Portfolio;
  override: Portfolio | null;
  undo: Portfolio | null;
  loadRequest: { current: number };
  setPlan: (plan: SimplePlan | ((current: SimplePlan) => SimplePlan)) => void;
  setOverride: (portfolio: Portfolio | null) => void;
  setUndo: (portfolio: Portfolio | null) => void;
  setSelectedId: (id: string | null | ((current: string | null) => string | null)) => void;
  setNotice: (notice: string) => void;
  setUsageError: (error: string) => void;
  setUsageBusy: (busy: boolean) => void;
  setUsagePreview: (preview: UsageImportPreview | null) => void;
  setTheme: (theme: Theme | ((current: Theme) => Theme)) => void;
}
