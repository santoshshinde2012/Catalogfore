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
import { Summary } from "./components/Summary";
import { Welcome } from "./components/Welcome";
import { money } from "./format";
import { smallAnalyticsTeam } from "./templates";

type View = "desk" | "scenarios" | "actuals" | "method";
type Theme = "dark" | "light";

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
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));

  const result = useMemo(() => estimate(portfolio), [portfolio]);
  const points = useMemo(() => forecast(result, portfolio.forecast), [result, portfolio.forecast]);

  useEffect(() => {
    const next = `#${encodePortfolio(portfolio)}`;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  }, [portfolio]);

  useEffect(() => {
    if (theme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem("dcf-theme", theme);
  }, [theme]);

  function dismissWelcome() {
    sessionStorage.setItem("dcf-welcomed", "1");
    setWelcome(false);
  }

  function openView(next: View) {
    dismissWelcome();
    setView(next);
  }

  function replace(next: Portfolio) {
    const normalized = normalizePortfolio(next);
    setPortfolio(normalized);
    setSelectedId(normalized.workloads[0]?.id ?? null);
    setView("desk");
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
    <div className="shell">
      <a className="skip" href="#desk">
        Skip to forecast
      </a>
      <header className="nav">
        <div className="wrap nav-inner">
          <button type="button" className="brand" onClick={() => setWelcome(true)}>
            <Mark />
            ledger
          </button>
          <nav aria-label="Sections">
            <div className="tabs" role="tablist" aria-label="Sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="tab"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={!welcome && view === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => openView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="nav-actions">
            <span className="nav-stat">{money(annualTotal(points), 0)} / yr</span>
            <button
              type="button"
              className="icon-btn"
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void share()}>
              {notice || "Copy link"}
            </button>
            <label className="btn btn-ghost">
              Open
              <input
                className="sr-only"
                type="file"
                accept="application/json"
                aria-label="Open a saved forecast"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) loadFile(file);
                }}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={() => setWelcome(true)}>
              Templates
            </button>
          </div>
        </div>
      </header>
      <main className="app-main" id="desk">
        {welcome ? (
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
        ) : view === "desk" ? (
          <div className="page" id="panel-desk" role="tabpanel" aria-labelledby="tab-desk">
            <Summary portfolio={portfolio} estimate={result} points={points} />
            <div className="workspace wrap">
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
          </div>
        ) : (
          <div className="page" id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`}>
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
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path d="M6 16.5h12M7.5 16.5V12m4.5 4.5V8.5m4.5 8V6.5" stroke="#fafcff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10.2 2.2a5.2 5.2 0 1 0 3.6 8.8A5.6 5.6 0 0 1 10.2 2.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
