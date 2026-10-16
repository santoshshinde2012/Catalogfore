import { FolderOpen, Menu, Moon, Star, Sun } from "lucide-react";
import { useState } from "react";
import type { SimpleSession } from "../hooks/useSimpleForecast";
import { REPO } from "../site";
import { SimplePage } from "./simple/SimplePage";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

export function AppShell({ session }: { session: SimpleSession }) {
  const [howOpen, setHowOpen] = useState(false);
  const [advancedAsk, setAdvancedAsk] = useState(0);

  function showForecast() {
    document.getElementById("forecast")?.scrollIntoView({ behavior: "smooth" });
  }
  function showAdvanced() {
    setAdvancedAsk((value) => value + 1);
  }
  function showHow() {
    setHowOpen(true);
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  }

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
              <span className="flex size-6 items-center justify-center rounded-md bg-foreground" aria-hidden="true">
                <span className="size-2 rounded-full bg-lava" />
              </span>
              Cayfore
            </button>
            <nav aria-label="Page" className="ml-2 hidden items-center gap-1 lg:flex">
              <Button type="button" variant="ghost" onClick={showForecast}>
                Forecast
              </Button>
              <Button type="button" variant="ghost" onClick={showAdvanced}>
                Advanced
              </Button>
              <Button type="button" variant="ghost" onClick={showHow}>
                How it works
              </Button>
            </nav>
            <div className="ml-auto flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                    <Menu />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={showForecast}>Forecast</DropdownMenuItem>
                  <DropdownMenuItem onSelect={showAdvanced}>Advanced</DropdownMenuItem>
                  <DropdownMenuItem onSelect={showHow}>How it works</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={REPO}>
                  <Star />
                  Star
                </a>
              </Button>
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
          <SimplePage session={session} howOpen={howOpen} onHowOpen={setHowOpen} advancedAsk={advancedAsk} />
        </main>
        <footer className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-8 pb-28 sm:px-6 lg:pb-12">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-md">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="flex size-5 items-center justify-center rounded-md bg-foreground" aria-hidden="true">
                    <span className="size-1.5 rounded-full bg-lava" />
                  </span>
                  Cayfore
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  An independent estimate of Databricks spend. Not a quote, and not affiliated with Databricks.
                </p>
              </div>
              <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
                <a className="text-link underline-offset-4 hover:underline" href="#forecast">
                  Forecast
                </a>
                <a className="text-link underline-offset-4 hover:underline" href="#how-it-works">
                  How it works
                </a>
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
