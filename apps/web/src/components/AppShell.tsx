import type { SimpleSession } from "../hooks/useSimpleForecast";
import { SimplePage } from "./simple/SimplePage";
import { Mark, MoonIcon, SunIcon } from "./icons";

export function AppShell({ session }: { session: SimpleSession }) {
  return (
    <div className="shell">
      <a className="skip" href="#forecast">
        Skip to content
      </a>
      <header className="nav">
        <div className="wrap nav-inner">
          <button type="button" className="brand" onClick={session.reset}>
            <Mark />
            Fathom
          </button>
          <div className="nav-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label={session.theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              onClick={session.toggleTheme}
            >
              {session.theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void session.share()}>
              {session.notice || "Copy link"}
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
                  event.target.value = "";
                  if (file) session.loadForecastFile(file);
                }}
              />
            </label>
          </div>
        </div>
      </header>
      <main className="app-main">
        <SimplePage session={session} />
      </main>
      <footer className="site-foot wrap">
        <p>Fathom is an estimate. It is not a Databricks quote.</p>
        <a href="https://github.com/santoshshinde2012/databricks-cost-forecaster">Source</a>
      </footer>
      <p className="sr-only" role="status">
        {session.notice}
      </p>
      {session.canUndo && (
        <div className="toast" role="status">
          Workload removed
          <button type="button" className="btn" onClick={session.undoRemove}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
