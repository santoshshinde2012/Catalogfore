import {
  annualTotal,
  blankPortfolio,
  decodePortfolio,
  encodePortfolio,
  estimate,
  forecast,
  normalizePortfolio,
  type Estimate,
  type ForecastPoint,
  type Portfolio,
} from "@dcf/engine";
import { useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";
export type Mode = "ask" | "answer";

function initialState(): { portfolio: Portfolio; mode: Mode } {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const decoded = decodePortfolio(hash);
    if (decoded) return { portfolio: decoded, mode: "answer" };
  }
  return { portfolio: blankPortfolio(), mode: "ask" };
}

export interface ForecastSession {
  portfolio: Portfolio;
  mode: Mode;
  theme: Theme;
  notice: string;
  undo: Portfolio | null;
  selectedId: string | null;
  estimate: Estimate;
  points: ForecastPoint[];
  annual: number;
  hasForecast: boolean;
  setPortfolio: (portfolio: Portfolio) => void;
  setSelectedId: (id: string | null) => void;
  showAnswer: (portfolio: Portfolio) => void;
  goHome: () => void;
  returnToAnswer: () => void;
  remove: (id: string) => void;
  undoRemove: () => void;
  share: () => Promise<void>;
  loadFile: (file: File) => void;
  toggleTheme: () => void;
  startBlank: () => void;
}

export function useForecastSession(): ForecastSession {
  const initial = useMemo(initialState, []);
  const [portfolio, setPortfolio] = useState(initial.portfolio);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [selectedId, setSelectedId] = useState<string | null>(initial.portfolio.workloads[0]?.id ?? null);
  const [undo, setUndo] = useState<Portfolio | null>(null);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );

  const result = useMemo(() => estimate(portfolio), [portfolio]);
  const points = useMemo(() => forecast(result, portfolio.forecast), [result, portfolio.forecast]);

  useEffect(() => {
    if (mode !== "answer") return;
    const next = `#${encodePortfolio(portfolio)}`;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  }, [portfolio, mode]);

  useEffect(() => {
    if (theme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem("dcf-theme", theme);
  }, [theme]);

  function showAnswer(next: Portfolio) {
    const normalized = normalizePortfolio(next);
    setPortfolio(normalized);
    setSelectedId(normalized.workloads[0]?.id ?? null);
    setMode("answer");
    setUndo(null);
  }

  function goHome() {
    setMode("ask");
    const path = `${window.location.pathname}${window.location.search}`;
    if (window.location.hash) history.replaceState(null, "", path);
  }

  function remove(id: string) {
    setUndo(portfolio);
    setPortfolio({ ...portfolio, workloads: portfolio.workloads.filter((workload) => workload.id !== id) });
    setSelectedId((current) => (current === id ? null : current));
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
    window.setTimeout(() => setNotice(""), 2500);
  }

  function loadFile(file: File) {
    void file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as { portfolio?: unknown };
        showAnswer(normalizePortfolio(parsed.portfolio ?? parsed));
      } catch {
        window.alert("That file is not a forecast JSON.");
      }
    });
  }

  return {
    portfolio,
    mode,
    theme,
    notice,
    undo,
    selectedId,
    estimate: result,
    points,
    annual: annualTotal(points),
    hasForecast: portfolio.workloads.length > 0,
    setPortfolio,
    setSelectedId,
    showAnswer,
    goHome,
    returnToAnswer: () => setMode("answer"),
    remove,
    undoRemove: () => {
      if (!undo) return;
      setPortfolio(undo);
      setUndo(null);
    },
    share,
    loadFile,
    toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
    startBlank: () => showAnswer(blankPortfolio(portfolio.cloud)),
  };
}
