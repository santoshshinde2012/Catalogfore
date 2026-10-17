import {
  encodePortfolio,
  estimate,
  forecast,
  projectSimple,
  recommendations,
  rollForward,
  type Portfolio,
} from "@cayfore/engine";
import { useEffect, useMemo, useState } from "react";
import { readStoredTheme, storeTheme } from "../theme-storage";
import { readInitial, type SimpleSession, type Theme } from "./forecast-session";
import { sessionActions } from "./session-actions";

export type { SimpleSession };

export function useSimpleForecast(): SimpleSession {
  const initial = useMemo(readInitial, []);
  const [plan, setPlan] = useState(initial.plan);
  const [override, setOverride] = useState<Portfolio | null>(initial.override);
  const [selectedId, setSelectedId] = useState<string | null>(initial.override?.workloads[0]?.id ?? null);
  const [undo, setUndo] = useState<Portfolio | null>(null);
  const [notice, setNotice] = useState("");
  const [usageError, setUsageError] = useState("");
  const [usageBusy, setUsageBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (document.documentElement.dataset.theme === "dark") return "dark";
    return readStoredTheme() === "dark" ? "dark" : "light";
  });

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
    const root = document.documentElement;
    root.classList.add("theme-swap");
    if (theme === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;
    storeTheme(theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0B2026" : "#F6F6F7");
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove("theme-swap"));
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  const actions = sessionActions({
    plan,
    portfolio,
    override,
    undo,
    setPlan,
    setOverride,
    setUndo,
    setSelectedId,
    setNotice,
    setUsageError,
    setUsageBusy,
    setTheme,
  });

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
    ...actions,
  };
}
