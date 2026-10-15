import {
  annualTotal,
  blankPortfolio,
  decodePortfolio,
  encodePortfolio,
  estimate,
  forecast,
  listRegions,
  normalizePortfolio,
  type Portfolio,
  type ScenarioPresetId,
} from "@dcf/engine";
import { useEffect, useMemo, useState } from "react";
import { Actuals } from "./components/Actuals";
import { Instrument } from "./components/Instrument";
import { Ledger } from "./components/Ledger";
import { Method } from "./components/Method";
import { Scenarios } from "./components/Scenarios";
import { Welcome } from "./components/Welcome";
import { money } from "./format";
import { smallAnalyticsTeam } from "./templates";

type View = "desk" | "scenarios" | "actuals" | "method";

function initialPortfolio(): { portfolio: Portfolio; welcomed: boolean } {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const decoded = decodePortfolio(hash);
    if (decoded) return { portfolio: decoded, welcomed: true };
  }
  const seen = sessionStorage.getItem("dcf-welcomed") === "1";
  return { portfolio: smallAnalyticsTeam(), welcomed: seen };
}

export function App() {
  const initial = useMemo(initialPortfolio, []);
  const [portfolio, setPortfolio] = useState(initial.portfolio);
  const [view, setView] = useState<View>("desk");
  const [selectedId, setSelectedId] = useState<string | null>(initial.portfolio.workloads[0]?.id ?? null);
  const [welcome, setWelcome] = useState(!initial.welcomed);
  const [scenarios, setScenarios] = useState<ScenarioPresetId[]>(["as_modeled", "jobs_serverless", "commit_37"]);
  const [undo, setUndo] = useState<Portfolio | null>(null);
  const [notice, setNotice] = useState("");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const result = useMemo(() => estimate(portfolio), [portfolio]);
  const points = useMemo(() => forecast(result, portfolio.forecast), [result, portfolio.forecast]);

  useEffect(() => {
    const next = `#${encodePortfolio(portfolio)}`;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  }, [portfolio]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("dcf-theme", dark ? "dark" : "light");
  }, [dark]);

  function dismissWelcome() {
    sessionStorage.setItem("dcf-welcomed", "1");
    setWelcome(false);
  }

  function replace(next: Portfolio) {
    const normalized = normalizePortfolio(next);
    setPortfolio(normalized);
    setSelectedId(normalized.workloads[0]?.id ?? null);
    dismissWelcome();
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
        replace(normalizePortfolio(parsed.portfolio ?? parsed));
      } catch {
        window.alert("That file is not a forecast JSON.");
      }
    });
  }

  const tabs: { id: View; label: string }[] = [
    { id: "desk", label: "Desk" },
    { id: "scenarios", label: "Scenarios" },
    { id: "actuals", label: "Actuals" },
    { id: "method", label: "Method" },
  ];

  return (
    <>
    <div className="shell" inert={welcome ? true : undefined}>
      <header className="topbar">
        <a className="skip" href="#desk">
          Skip to workloads
        </a>
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 15h14M4 15V9m4 6V6m4 9V4m4 11V8" stroke="#e39a62" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h1 className="wordmark">Ledger</h1>
            <p className="eyebrow">Databricks cost forecaster · estimates only</p>
          </div>
        </div>
        <div className="top-actions">
          <span className="hidden md:inline text-sm text-[var(--ink-soft)] self-center">
            {money(annualTotal(points))} / year
          </span>
          <button type="button" className="btn" onClick={() => setDark((value) => !value)}>
            {dark ? "Light" : "Dark"}
          </button>
          <button type="button" className="btn" onClick={() => void share()}>
            {notice || "Copy link"}
          </button>
          <label className="btn">
            Open
            <input
              className="sr-only"
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
          </label>
          <button type="button" className="btn-ghost" onClick={() => setWelcome(true)}>
            Templates
          </button>
        </div>
      </header>
      <nav aria-label="Sections">
        <div className="tabs" role="tablist" aria-label="Sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="tab"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={view === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="app-main">
      {view === "desk" ? (
        <div className="workspace" id="panel-desk" role="tabpanel" aria-labelledby="tab-desk">
          <Ledger
            portfolio={portfolio}
            estimate={result}
            selectedId={selectedId}
            onPortfolio={setPortfolio}
            onSelect={setSelectedId}
            onRemove={remove}
          />
          <Instrument portfolio={portfolio} estimate={result} points={points} onPortfolio={setPortfolio} />
        </div>
      ) : (
        <div className="workspace" style={{ gridTemplateColumns: "1fr" }} id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`}>
          {view === "scenarios" && (
            <Scenarios
              portfolio={portfolio}
              selected={scenarios}
              onToggle={(id) =>
                setScenarios((current) => {
                  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
                  return next.length ? next : ["as_modeled"];
                })
              }
            />
          )}
          {view === "actuals" && <Actuals portfolio={portfolio} onPortfolio={setPortfolio} />}
          {view === "method" && <Method />}
        </div>
      )}
      </main>
      {undo && (
        <div className="toast" role="status">
          Workload removed
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPortfolio(undo);
              setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
    {welcome && (
      <Welcome
        onChoose={replace}
        onBlank={() => {
          const cloud = portfolio.cloud;
          const next = blankPortfolio(cloud);
          next.region = listRegions(cloud)[0]?.id ?? next.region;
          next.workloads = [];
          replace(next);
        }}
        onClose={dismissWelcome}
      />
    )}
    </>
  );
}
