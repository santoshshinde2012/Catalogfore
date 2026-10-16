import {
  applyRecommendation,
  decodePortfolio,
  defaultPlan,
  encodePortfolio,
  estimate,
  forecast,
  normalizePortfolio,
  adjustMix,
  planForMix,
  planForPreset,
  planForSpend,
  planFromUsage,
  projectSimple,
  recommendations,
  rollForward,
  withCommit,
  withGrowth,
  withRates,
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
} from "@dcf/engine";
import { useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";

function planFromPortfolio(portfolio: Portfolio): SimplePlan | null {
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
  });
}

function hydrate(plan: SimplePlan): SimplePlan {
  const empty =
    plan.basket.etlNodes === 0 && plan.basket.sqlClusters === 0 && plan.basket.mlInputTokens === 0 && !plan.usageDbu;
  if (empty && plan.monthlySpend > 0) return planForSpend(plan, plan.monthlySpend);
  return plan;
}

function readInitial(): { plan: SimplePlan; override: Portfolio | null } {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const decoded = decodePortfolio(hash);
    const fromSimple = decoded ? planFromPortfolio(decoded) : null;
    if (fromSimple) return { plan: fromSimple, override: null };
    if (decoded && decoded.workloads.length > 0) {
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

export interface SimpleSession {
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
  loadSample: () => void;
  clearUsage: () => void;
  share: () => Promise<void>;
  reset: () => void;
  toggleTheme: () => void;
  loadForecastFile: (file: File) => void;
  editPortfolio: (portfolio: Portfolio) => void;
  selectWorkload: (id: string | null) => void;
  removeWorkload: (id: string) => void;
  undoRemove: () => void;
  applyTip: (id: RecommendationId) => void;
}

export function useSimpleForecast(): SimpleSession {
  const initial = useMemo(readInitial, []);
  const [plan, setPlan] = useState(initial.plan);
  const [override, setOverride] = useState<Portfolio | null>(initial.override);
  const [selectedId, setSelectedId] = useState<string | null>(initial.override?.workloads[0]?.id ?? null);
  const [undo, setUndo] = useState<Portfolio | null>(null);
  const [notice, setNotice] = useState("");
  const [usageError, setUsageError] = useState("");
  const [usageBusy, setUsageBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );

  const projection = useMemo(() => projectSimple(plan), [plan]);
  const portfolio = override ?? projection.portfolio;
  const result = useMemo(() => (override ? estimate(override) : projection.estimate), [override, projection.estimate]);
  const points = useMemo(
    () => (override ? forecast(result, override.forecast) : projection.points),
    [override, projection.points, result],
  );
  const rolled = useMemo(() => (override ? rollForward(override, result, points) : null), [override, points, result]);

  useEffect(() => {
    const next = `#${encodePortfolio(portfolio)}`;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  }, [portfolio]);

  useEffect(() => {
    if (theme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem("dcf-theme", theme);
  }, [theme]);

  function replacePlan(next: SimplePlan) {
    setOverride(null);
    setUndo(null);
    setUsageError("");
    setPlan(next);
  }

  function loadUsageText(text: string) {
    const loaded = planFromUsage(plan, text);
    if (!loaded.ok) {
      setUsageError(loaded.error);
      return;
    }
    replacePlan(loaded.plan);
  }

  return {
    plan,
    portfolio,
    estimate: result,
    points,
    months: rolled?.months ?? projection.months,
    annual: rolled?.annual ?? projection.annual,
    spreadPercent: rolled?.spreadPercent ?? projection.spreadPercent,
    listMonthly: rolled?.listMonthly ?? projection.listMonthly,
    cloudShare: rolled?.cloudShare ?? projection.cloudShare,
    assumptions: override
      ? ["These figures follow the detailed workloads below. Changing the inputs above replaces those edits."]
      : projection.assumptions,
    recommendations: recommendations(portfolio).slice(0, 3),
    usingDetail: override !== null,
    usingUsage: plan.usageDbu != null && override === null,
    theme,
    notice,
    usageError,
    usageBusy,
    selectedId,
    canUndo: undo !== null,
    setCloud: (cloud) => replacePlan(withRates(plan, { cloud, tier: plan.tier, region: plan.region })),
    setTier: (tier) => replacePlan(withRates(plan, { cloud: plan.cloud, tier, region: plan.region })),
    setRegion: (region) => replacePlan(withRates(plan, { cloud: plan.cloud, tier: plan.tier, region })),
    setSpend: (amount) => replacePlan(planForSpend(plan, amount)),
    setPreset: (id) => replacePlan(planForPreset(plan, id)),
    setMix: (key, value) => replacePlan(planForMix(plan, adjustMix(plan.mix, key, value))),
    setGrowth: (rate) => replacePlan(withGrowth(plan, rate)),
    setCommit: (rate) => replacePlan(withCommit(plan, rate)),
    loadUsageText,
    loadUsageFile: (file) => {
      setUsageBusy(true);
      void file.text().then((text) => {
        loadUsageText(text);
        setUsageBusy(false);
      });
    },
    loadSample: () => {
      setUsageBusy(true);
      setUsageError("");
      void fetch(`${import.meta.env.BASE_URL}sample-usage.csv`)
        .then((response) => {
          if (!response.ok) throw new Error("missing");
          return response.text();
        })
        .then((text) => loadUsageText(text))
        .catch(() => setUsageError("The sample file did not load."))
        .finally(() => setUsageBusy(false));
    },
    clearUsage: () => replacePlan(planForSpend({ ...plan, usageDbu: undefined }, plan.monthlySpend)),
    share: async () => {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
      } catch {
        window.prompt("Copy this link", url);
      }
      window.setTimeout(() => setNotice(""), 2500);
    },
    reset: () => replacePlan(defaultPlan()),
    toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
    loadForecastFile: (file) => {
      void file.text().then((text) => {
        try {
          const parsed = JSON.parse(text) as { portfolio?: unknown };
          const decoded = normalizePortfolio(parsed.portfolio ?? parsed);
          const simple = planFromPortfolio(decoded);
          if (simple) replacePlan(simple);
          else {
            const detached = { ...decoded };
            delete detached.simple;
            setPlan((current) => ({ ...current, cloud: decoded.cloud, tier: decoded.tier, region: decoded.region }));
            setOverride(detached);
            setSelectedId(detached.workloads[0]?.id ?? null);
          }
        } catch {
          window.alert("That file is not a forecast JSON.");
        }
      });
    },
    editPortfolio: (next) => {
      const detached = { ...next };
      delete detached.simple;
      setOverride(detached);
      setUndo(null);
    },
    selectWorkload: setSelectedId,
    removeWorkload: (id) => {
      setUndo(portfolio);
      const next = { ...portfolio, workloads: portfolio.workloads.filter((workload) => workload.id !== id) };
      delete next.simple;
      setOverride(next);
      setSelectedId((current) => (current === id ? null : current));
    },
    undoRemove: () => {
      if (!undo) return;
      setOverride(undo);
      setUndo(null);
    },
    applyTip: (id) => {
      if (!override && (id === "commit_37" || id === "commit_37_cloud_30")) {
        replacePlan(withCommit(plan, Math.max(plan.commitDiscount, 0.37)));
        return;
      }
      const next = applyRecommendation(portfolio, id);
      delete next.simple;
      setOverride(next);
    },
  };
}
