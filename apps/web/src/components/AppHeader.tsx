import { FolderOpen, Menu, Moon, RotateCcw, Star, Sun } from "lucide-react";
import { useRef } from "react";
import type { Theme } from "../hooks/forecast-session";
import { REPO } from "../site";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export function AppHeader({
  theme,
  onTheme,
  onInputs,
  onForecast,
  onAdvanced,
  onHow,
  onNew,
  onOpen,
}: {
  theme: Theme;
  onTheme: () => void;
  onInputs: () => void;
  onForecast: () => void;
  onAdvanced: () => void;
  onHow: () => void;
  onNew: () => void;
  onOpen: (file: File) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const menuAction = useRef<(() => void) | null>(null);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <button
          type="button"
          className="-ml-2 flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold tracking-tight hover:bg-muted"
          onClick={onInputs}
          aria-label="Cayfore — edit your plan"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground" aria-hidden="true">
            <span className="size-2 rounded-full bg-lava" />
          </span>
          Cayfore
        </button>
        <nav aria-label="Page" className="ml-3 hidden items-center gap-1 lg:flex">
          <Button type="button" variant="ghost" onClick={onForecast}>
            Forecast
          </Button>
          <Button type="button" variant="ghost" onClick={onAdvanced}>
            Advanced
          </Button>
          <Button type="button" variant="ghost" onClick={onHow}>
            How it works
          </Button>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="hidden md:inline-flex" asChild>
            <a href={REPO} target="_blank" rel="noreferrer">
              <Star />
              Star
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            onClick={onTheme}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="size-11 p-0 sm:h-9 sm:w-auto sm:px-3.5"
            aria-label="Open forecast"
            title="Open a saved forecast"
            onClick={() => upload.current?.click()}
          >
            <FolderOpen />
            <span className="hidden sm:inline">Open</span>
          </Button>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Menu">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(event) => {
                const action = menuAction.current;
                if (!action) return;
                event.preventDefault();
                menuAction.current = null;
                requestAnimationFrame(action);
              }}
            >
              <DropdownMenuItem
                onSelect={() => {
                  menuAction.current = onInputs;
                }}
              >
                Edit inputs
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  menuAction.current = onForecast;
                }}
              >
                Forecast
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  menuAction.current = onAdvanced;
                }}
              >
                Advanced
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  menuAction.current = onHow;
                }}
              >
                How it works
              </DropdownMenuItem>
              <DropdownMenuItem
                className="mt-1 gap-2 border-t pt-2"
                onSelect={() => {
                  menuAction.current = onNew;
                }}
              >
                <RotateCcw className="size-4" />
                New forecast
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
