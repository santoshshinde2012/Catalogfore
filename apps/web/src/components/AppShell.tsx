import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { navigateToSection } from "../lib/page-navigation";
import { AppHeader } from "./AppHeader";
import type { SimpleSession } from "../hooks/useSimpleForecast";
import { REPO } from "../site";
import { SimplePage } from "./simple/SimplePage";
import { Toaster } from "./ui/sonner";
import { InfoTooltip, TooltipProvider } from "./ui/tooltip";

export function AppShell({ session }: { session: SimpleSession }) {
  const [howOpen, setHowOpen] = useState(false);
  const [advancedAsk, setAdvancedAsk] = useState(0);

  function navigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    navigateToSection(id);
  }

  function showForecast() {
    navigateToSection("forecast");
  }
  function showAdvanced() {
    setAdvancedAsk((value) => value + 1);
  }
  function showHow() {
    setHowOpen(true);
    requestAnimationFrame(() => navigateToSection("how-it-works"));
  }

  return (
    <TooltipProvider>
      <div className="min-h-svh">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          href="#forecast"
          onClick={(event) => navigate(event, "forecast")}
        >
          Skip to content
        </a>
        <AppHeader
          theme={session.theme}
          onTheme={session.toggleTheme}
          onInputs={() => navigateToSection("plan-inputs")}
          onForecast={showForecast}
          onAdvanced={showAdvanced}
          onHow={showHow}
          onOpen={session.loadForecastFile}
          onNew={() => {
            session.reset();
            navigateToSection("plan-inputs");
            toast("Started a new forecast", { description: "Use Undo last change to restore your previous plan." });
          }}
        />
        <main>
          <SimplePage session={session} howOpen={howOpen} onHowOpen={setHowOpen} advancedAsk={advancedAsk} />
        </main>
        <footer className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12">
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
                <InfoTooltip
                  label="Forecast"
                  description="Return to your annual estimate and interactive cost charts."
                  side="top"
                >
                  <a
                    className="text-link underline-offset-4 hover:underline"
                    href="#forecast"
                    onClick={(event) => navigate(event, "forecast")}
                  >
                    Forecast
                  </a>
                </InfoTooltip>
                <InfoTooltip
                  label="How it works"
                  description="Understand the assumptions and pricing behind this estimate."
                  side="top"
                >
                  <a
                    className="text-link underline-offset-4 hover:underline"
                    href="#how-it-works"
                    onClick={(event) => {
                      setHowOpen(true);
                      navigate(event, "how-it-works");
                    }}
                  >
                    How it works
                  </a>
                </InfoTooltip>
                <InfoTooltip
                  label="Source code"
                  description="Explore Cayfore's implementation and contribute on GitHub."
                  side="top"
                >
                  <a className="text-link underline-offset-4 hover:underline" href={REPO}>
                    Source
                  </a>
                </InfoTooltip>
                <InfoTooltip
                  label="MIT License"
                  description="Read the terms for using and adapting this open-source project."
                  side="top"
                >
                  <a className="text-link underline-offset-4 hover:underline" href={`${REPO}/blob/main/LICENSE`}>
                    License
                  </a>
                </InfoTooltip>
                <InfoTooltip
                  label="Pricing research"
                  description="Review the published rate sources and research notes."
                  side="top"
                >
                  <a
                    className="text-link underline-offset-4 hover:underline"
                    href={`${REPO}/blob/main/docs/RESEARCH.md`}
                  >
                    Rates
                  </a>
                </InfoTooltip>
                <InfoTooltip
                  label="Architecture"
                  description="See how the catalog, forecasting engine, and web app fit together."
                  side="top"
                >
                  <a
                    className="text-link underline-offset-4 hover:underline"
                    href={`${REPO}/blob/main/docs/ARCHITECTURE.md`}
                  >
                    Architecture
                  </a>
                </InfoTooltip>
              </nav>
            </div>
            <p className="text-xs text-muted-foreground">MIT License</p>
          </div>
        </footer>
        <Toaster theme={session.theme} />
      </div>
    </TooltipProvider>
  );
}
