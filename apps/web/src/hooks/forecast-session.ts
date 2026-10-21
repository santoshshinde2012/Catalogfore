import type { SavedScenario } from "./saved-scenarios";

import {
  decodePortfolio,
  projectPortfolio,
  type UsageImportPreview,
  defaultPlan,
  planForSpend,
  recommendations,
  type Cloud,
  type Estimate,
  type ForecastPoint,
  type Portfolio,
  type RecommendationId,
  type SimpleMonth,
  type SimplePlan,
  type TeamPresetId,
  type Tier,
  type WorkloadMix,
} from "@cayfore/engine";
import type { UnitCostRow } from "@cayfore/engine/unit-costs";

export interface SimpleSession {
  forecastResult: ReturnType<typeof projectPortfolio>;
  plan: SimplePlan;
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  months: SimpleMonth[];
  annual: number;
  spreadPercent: number;
  listMonthly: number;
  cloudShare: number;
  assumptions: string[];
  recommendations: ReturnType<typeof recommendations>;
  usingDetail: boolean;
  usingUsage: boolean;
  theme: Theme;
  notice: string;
  usageError: string;
  usageBusy: boolean;
  usagePreview: UsageImportPreview | null;
  scenarios: SavedScenario[];
  comparison: SavedScenario | null;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  duplicateScenario: (id: string, name?: string) => void;
  removeScenario: (id: string) => void;
  compareScenario: (id: string | null) => void;
  setBudget: (amount: number | undefined) => void;
  setCloudDiscount: (rate: number) => void;
  resetToQuick: () => void;
  loadUsagePreview: (preview: UsageImportPreview, mode: "replace" | "append") => void;
  dismissUsagePreview: () => void;
  selectedId: string | null;
  canUndo: boolean;
  setCloud: (cloud: Cloud) => void;
  setTier: (tier: Tier) => void;
  setRegion: (region: string) => void;
  setSpend: (amount: number) => void;
  setPreset: (id: TeamPresetId) => void;
  setMix: (key: keyof WorkloadMix, value: number) => void;
  setGrowth: (rate: number) => void;
  setCommit: (rate: number) => void;
  loadUsageText: (text: string) => void;
  loadUsageFile: (file: File) => void;
  loadSample: (kind?: "current" | "history") => void;
  clearUsage: () => void;
  share: () => Promise<void>;
  reset: () => void;
  toggleTheme: () => void;
  loadForecastFile: (file: File) => Promise<void>;
  editPortfolio: (portfolio: Portfolio) => void;
  addProduct: (id: string) => boolean;
  applyUnitCost: (row: UnitCostRow, quantity: number) => boolean;
  selectWorkload: (id: string | null) => void;
  removeWorkload: (id: string) => void;
  undoRemove: () => void;
  applyTip: (id: RecommendationId) => void;
}

export type Theme = "dark" | "light";

export function planFromPortfolio(portfolio: Portfolio): SimplePlan | null {
  if (!portfolio.simple) return null;
  return hydrate({
    cloud: portfolio.cloud,
    tier: portfolio.tier,
    region: portfolio.region,
    monthlySpend: portfolio.simple.monthlySpend,
    mix: portfolio.simple.mix,
    monthlyGrowth: portfolio.simple.monthlyGrowth,
    commitDiscount: portfolio.simple.commitDiscount,
    basket: portfolio.simple.basket,
    ...(portfolio.simple.usageDbu ? { usageDbu: portfolio.simple.usageDbu } : {}),
    ...(portfolio.simple.usageForecast ? { usageForecast: portfolio.simple.usageForecast } : {}),
  });
}

function hydrate(plan: SimplePlan): SimplePlan {
  const empty =
    plan.basket.etlNodes === 0 && plan.basket.sqlClusters === 0 && plan.basket.mlInputTokens === 0 && !plan.usageDbu;
  if (empty && plan.monthlySpend > 0) return planForSpend(plan, plan.monthlySpend);
  return plan;
}

export function readInitial(): { plan: SimplePlan; override: Portfolio | null } {
  const hash = window.location.hash.replace(/^#(?:plan=)?/, "");
  if (hash) {
    const decoded = decodePortfolio(hash);
    const fromSimple = decoded ? planFromPortfolio(decoded) : null;
    if (fromSimple && decoded) return { plan: fromSimple, override: decoded };
    if (decoded) {
      const detached = { ...decoded };
      delete detached.simple;
      return {
        plan: { ...defaultPlan(), cloud: decoded.cloud, tier: decoded.tier, region: decoded.region },
        override: detached,
      };
    }
  }
  return { plan: defaultPlan(), override: null };
}
