import {
  encodePortfolio,
  projectPortfolio,
  projectSimple,
  recommendations,
  type Portfolio,
  type UsageImportPreview,
} from "@cayfore/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { readStoredTheme, storeTheme } from "../theme-storage";
import { readInitial, type SimpleSession, type Theme } from "./forecast-session";
import { useSavedScenarios } from "./saved-scenarios";
import { sessionActions } from "./session-actions";

export type { SimpleSession };

export function useSimpleForecast(): SimpleSession {
  const initial = useMemo(readInitial, []);
  const [plan, setPlan] = useState(initial.plan);
  const [override, setOverride] = useState<Portfolio | null>(initial.override);
  const [selectedId, setSelectedId] = useState<string | null>(initial.override?.workloads[0]?.id ?? null);
  const [undo, setUndo] = useState<Portfolio | null>(null);
  const loadRequest = useRef(0);
  const [notice, setNotice] = useState("");
  const [usageError, setUsageError] = useState("");
  const [usageBusy, setUsageBusy] = useState(false);
  const [usagePreview, setUsagePreview] = useState<UsageImportPreview | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (document.documentElement.dataset.theme === "dark") return "dark";
    return readStoredTheme() === "dark" ? "dark" : "light";
  });
  const quick = useMemo(() => projectSimple(plan), [plan]);
  const portfolio = override ?? quick.portfolio;
  const projection = useMemo(() => projectPortfolio(portfolio), [portfolio]);
  const ideas = useMemo(() => recommendations(portfolio).slice(0, 3), [portfolio]);
  useEffect(() => {
    function synchronizeShareUrl() {
      const next = `#plan=${encodePortfolio(portfolio)}`;
      if (window.location.hash !== next) history.replaceState(history.state, "", next);
    }
    synchronizeShareUrl();
    // View history changes the query string; the active session remains the source of truth for the plan.
    window.addEventListener("popstate", synchronizeShareUrl);
    return () => window.removeEventListener("popstate", synchronizeShareUrl);
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
    loadRequest,
    setPlan,
    setOverride,
    setUndo,
    setSelectedId,
    setNotice,
    setUsageError,
    setUsageBusy,
    setUsagePreview,
    setTheme,
  });
  const scenarios = useSavedScenarios(portfolio, actions.loadPortfolio, setNotice);
  return {
    ...projection,
    forecastResult: projection,
    plan,
    recommendations: ideas,
    usingDetail: !portfolio.simple,
    usingUsage: Boolean(portfolio.usage || portfolio.simple?.usageDbu),
    theme,
    notice,
    usageError,
    usageBusy,
    usagePreview,
    selectedId,
    canUndo: undo !== null,
    ...actions,
    ...scenarios,
  };
}
