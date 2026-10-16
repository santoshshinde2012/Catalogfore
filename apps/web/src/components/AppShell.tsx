import { FolderOpen, Moon, Sun } from "lucide-react";
import type { SimpleSession } from "../hooks/useSimpleForecast";
import { SimplePage } from "./simple/SimplePage";
import { Button } from "./ui/button";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

const REPO = "https://github.com/santoshshinde2012/databricks-cost-forecaster";

export function AppShell({ session }: { session: SimpleSession }) {
  return (
    <TooltipProvider>
      <div className="min-h-svh">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          href="#forecast"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="-ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold tracking-tight hover:bg-muted"
              onClick={session.reset}
            >
              <span className="size-2.5 rounded-full bg-lava" aria-hidden="true" />
              Fathom
            </button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={session.theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
                onClick={session.toggleTheme}
              >
                {session.theme === "light" ? <Moon /> : <Sun />}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <label>
                  <FolderOpen />
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
              </Button>
            </div>
          </div>
        </header>
        <main>
          <SimplePage session={session} />
        </main>
        <footer className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-8 pb-28 sm:px-6 lg:pb-12">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-md">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="size-2 rounded-full bg-lava" aria-hidden="true" />
                  Fathom
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  An independent estimate of Databricks spend. Not a quote, and not affiliated with Databricks.
                </p>
              </div>
              <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
                <a className="text-link underline-offset-4 hover:underline" href={REPO}>
                  Source
                </a>
                <a className="text-link underline-offset-4 hover:underline" href={`${REPO}/blob/main/LICENSE`}>
                  License
                </a>
                <a className="text-link underline-offset-4 hover:underline" href={`${REPO}/blob/main/docs/RESEARCH.md`}>
                  Rates
                </a>
                <a
                  className="text-link underline-offset-4 hover:underline"
                  href={`${REPO}/blob/main/docs/ARCHITECTURE.md`}
                >
                  Architecture
                </a>
              </nav>
            </div>
            <p className="text-xs text-muted-foreground">MIT License</p>
          </div>
        </footer>
        <p className="sr-only" role="status">
          {session.notice}
        </p>
        <Toaster theme={session.theme} />
      </div>
    </TooltipProvider>
  );
}
