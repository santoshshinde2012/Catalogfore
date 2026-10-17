import { ArrowUpRight, FolderOpen, Moon, Star, Sun } from "lucide-react";
import { useRef } from "react";
import type { Theme } from "../hooks/forecast-session";
import { REPO } from "../site";
import { Button } from "./ui/button";
import { headerNavigation, WorkspaceMenu } from "./WorkspaceMenu";
import { InfoTooltip } from "./ui/tooltip";

export function AppHeader({
  theme,
  onTheme,
  onInputs,
  onForecast,
  onProducts,
  productMapOpen = false,
  onAdvanced,
  onHow,
  onNew,
  onOpen,
}: {
  theme: Theme;
  onTheme: () => void;
  onInputs: () => void;
  onForecast: () => void;
  onProducts: () => void;
  productMapOpen?: boolean;
  onAdvanced: () => void;
  onHow: () => void;
  onNew: () => void;
  onOpen: (file: File) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const actions = { inputs: onInputs, forecast: onForecast, products: onProducts, advanced: onAdvanced, how: onHow };
  const themeLabel = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 shadow-[0_1px_12px_rgb(0_0_0/0.03)] backdrop-blur-xl">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lava/40 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <InfoTooltip
          label="Your planning workspace"
          description="Return to plan inputs. Your current forecast stays intact."
          align="start"
        >
          <button
            type="button"
            className="group -ml-1 flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-1 py-1 text-left sm:gap-3"
            onClick={onInputs}
          >
            <span
              className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-foreground/10 bg-foreground shadow-sm transition-transform group-hover:-translate-y-0.5 sm:size-10"
              aria-hidden="true"
            >
              <span className="size-2.5 rounded-full bg-lava shadow-[0_0_0_5px_rgb(255_54_33/0.12)]" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">Cayfore</span>
              <span className="hidden text-[9px] font-medium tracking-[0.16em] text-muted-foreground uppercase sm:block">
                Cost planning
              </span>
            </span>
          </button>
        </InfoTooltip>

        <nav
          aria-label="Page"
          className="ml-auto hidden items-center gap-0.5 rounded-2xl border bg-muted/50 p-1 xl:flex"
        >
          {headerNavigation.map(({ id, label, description, icon: Icon }) => (
            <InfoTooltip key={id} label={label} description={description}>
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 rounded-xl px-3 text-[13px] text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
                aria-haspopup={id === "advanced" ? "dialog" : undefined}
                aria-current={id === "products" && productMapOpen ? "page" : undefined}
                onClick={actions[id]}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </Button>
            </InfoTooltip>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 xl:ml-1">
          <InfoTooltip
            label="Support Cayfore"
            description="View the source and star the project on GitHub. Opens in a new tab."
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden min-h-10 rounded-xl text-muted-foreground md:inline-flex"
              asChild
            >
              <a href={REPO} target="_blank" rel="noreferrer" aria-label="Star on GitHub">
                <Star aria-hidden="true" />
                <span className="hidden xl:inline">Star</span>
                <ArrowUpRight className="hidden size-3 xl:block" aria-hidden="true" />
              </a>
            </Button>
          </InfoTooltip>
          <InfoTooltip label={themeLabel} description="Choose the appearance that feels best for your workspace.">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground"
              aria-label={themeLabel}
              onClick={onTheme}
            >
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </Button>
          </InfoTooltip>
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <InfoTooltip
            label="Open a saved forecast"
            description="Load a Cayfore JSON file to continue a previously exported plan."
          >
            <Button
              type="button"
              variant="outline"
              className="size-11 rounded-xl bg-background/60 p-0 sm:h-10 sm:w-auto sm:px-3"
              aria-label="Open forecast"
              onClick={() => upload.current?.click()}
            >
              <FolderOpen className="text-link" aria-hidden="true" />
              <span className="hidden sm:inline">Open</span>
            </Button>
          </InfoTooltip>
          <input
            ref={upload}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-label="Open a saved forecast"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onOpen(file);
            }}
          />
          <WorkspaceMenu actions={actions} onNew={onNew} productMapOpen={productMapOpen} />
        </div>
      </div>
    </header>
  );
}
