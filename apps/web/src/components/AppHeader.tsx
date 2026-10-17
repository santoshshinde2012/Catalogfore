import { useRef } from "react";
import type { Theme } from "../hooks/forecast-session";
import { WorkspaceMenu } from "./WorkspaceMenu";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { InfoTooltip } from "./ui/tooltip";

export function AppHeader({
  theme,
  onTheme,
  onInputs,
  onForecast,
  onProducts,
  onRates,
  productMapOpen = false,
  unitCostsOpen = false,
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
  onRates: () => void;
  productMapOpen?: boolean;
  unitCostsOpen?: boolean;
  onAdvanced: () => void;
  onHow: () => void;
  onNew: () => void;
  onOpen: (file: File) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const actions = {
    inputs: onInputs,
    forecast: onForecast,
    products: onProducts,
    rates: onRates,
    advanced: onAdvanced,
    how: onHow,
  };
  return (
    <header className="sticky top-0 z-40 h-[var(--workspace-header-height)] bg-card/95 shadow-[0_1px_0_var(--border),0_4px_24px_rgb(11_32_38/0.025)] backdrop-blur-xl">
      <div className="mx-auto grid h-15 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 md:h-18 md:grid-cols-[1fr_auto_1fr]">
        <InfoTooltip
          label="Your planning workspace"
          description="Return to plan inputs. Your current forecast stays intact."
          align="start"
        >
          <button
            type="button"
            className="group -ml-1 flex min-h-11 w-fit items-center gap-2.5 rounded-xl px-1 text-left sm:gap-3"
            onClick={onInputs}
          >
            <span
              className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-[#0b2026] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12),0_2px_6px_rgb(11_32_38/0.12)] transition-transform group-hover:-translate-y-0.5"
              aria-hidden="true"
            >
              <svg viewBox="0 0 36 36" className="size-9 fill-none">
                <path d="M9 25V11M9 25H27" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
                <path
                  d="M10 22L16 18L21 20L27 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="27" cy="12" r="3.5" fill="#ff3621" />
              </svg>
            </span>
            <span>
              <span className="block text-[19px] leading-6 font-semibold tracking-[-0.045em]">Cayfore</span>
              <span className="block text-[10px] leading-3.5 font-medium tracking-[0.015em] text-muted-foreground">
                Databricks cost planning
              </span>
            </span>
          </button>
        </InfoTooltip>
        <WorkspaceNavigation actions={actions} productMapOpen={productMapOpen} unitCostsOpen={unitCostsOpen} />
        <div className="justify-self-end">
          <WorkspaceMenu
            actions={actions}
            onNew={onNew}
            onOpen={() => upload.current?.click()}
            theme={theme}
            onTheme={onTheme}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl md:hidden">
        <WorkspaceNavigation compact actions={actions} productMapOpen={productMapOpen} unitCostsOpen={unitCostsOpen} />
      </div>
      <input
        ref={upload}
        hidden
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
    </header>
  );
}
