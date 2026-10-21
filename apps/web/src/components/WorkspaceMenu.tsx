import { Ellipsis, FolderOpen, Keyboard, Moon, Printer, RotateCcw, Star, Sun } from "lucide-react";
import { useRef } from "react";
import { openShortcuts } from "../services/shortcut-channel";
import type { Theme } from "../hooks/forecast-session";
import { APP_NAME, REPO } from "../site";
import { secondaryNavigation, type NavigationActions } from "./header-navigation";
import { WorkspaceMenuEntry } from "./WorkspaceMenuEntry";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { InfoTooltip } from "./ui/tooltip";

export function WorkspaceMenu({
  actions,
  onNew,
  onOpen,
  theme,
  onTheme,
}: {
  actions: NavigationActions;
  onNew: () => void;
  onOpen: () => void;
  theme: Theme;
  onTheme: () => void;
}) {
  const menuAction = useRef<(() => void) | null>(null);
  const themeLabel = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  return (
    <DropdownMenu modal={false}>
      <InfoTooltip
        label="Workspace menu"
        description="Open saved forecasts, edit workloads, and manage your workspace."
        align="end"
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 gap-2 rounded-none px-2.5 text-[13px] text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=open]:text-foreground sm:px-3"
            aria-label="Menu"
          >
            <Ellipsis aria-hidden="true" />
            Menu
          </Button>
        </DropdownMenuTrigger>
      </InfoTooltip>
      <DropdownMenuContent
        align="end"
        regionLabel="Workspace menu"
        collisionPadding={12}
        sideOffset={10}
        className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl p-1.5 shadow-[0_12px_48px_rgb(11_32_38/0.16)]"
        onCloseAutoFocus={(event) => {
          const action = menuAction.current;
          if (!action) return;
          event.preventDefault();
          menuAction.current = null;
          requestAnimationFrame(action);
        }}
      >
        <MenuGroupLabel>Planning</MenuGroupLabel>
        {secondaryNavigation.map(({ id, label, description, icon }) => (
          <WorkspaceMenuEntry
            key={id}
            label={label}
            description={description}
            icon={icon}
            aria-haspopup={id === "advanced" ? "dialog" : undefined}
            onSelect={() => {
              menuAction.current = actions[id];
            }}
          />
        ))}
        <MenuGroupLabel separated>Forecast files</MenuGroupLabel>
        <WorkspaceMenuEntry
          label="Open forecast"
          description={`Continue from a saved ${APP_NAME} JSON file.`}
          icon={FolderOpen}
          onSelect={onOpen}
        />
        <WorkspaceMenuEntry
          label="New forecast"
          description="Start with the default plan. Undo can restore your previous work."
          icon={RotateCcw}
          onSelect={() => {
            menuAction.current = onNew;
          }}
        />
        <MenuGroupLabel separated>Preferences & project</MenuGroupLabel>
        <WorkspaceMenuEntry
          label="Keyboard shortcuts"
          description="See Alt shortcuts for Plan, Product map, Unit costs, and Forecast."
          icon={Keyboard}
          onSelect={() => {
            menuAction.current = openShortcuts;
          }}
        />
        <WorkspaceMenuEntry
          label="Print forecast"
          description="Open a print view of this forecast without the workspace chrome."
          icon={Printer}
          onSelect={() => {
            menuAction.current = () => window.print();
          }}
        />
        <WorkspaceMenuEntry
          label={themeLabel}
          description="Choose the appearance for this browser."
          icon={theme === "light" ? Moon : Sun}
          onSelect={() => {
            menuAction.current = onTheme;
          }}
        />
        <WorkspaceMenuEntry
          label="Star on GitHub"
          description="View the source and support the project. Opens in a new tab."
          icon={Star}
          href={REPO}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuGroupLabel({ children, separated = false }: { children: string; separated?: boolean }) {
  return (
    <div className={separated ? "mx-2 mt-1 border-t pt-2" : "mx-2 pt-1"}>
      <p
        className="px-1 pt-1 pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
        aria-hidden="true"
      >
        {children}
      </p>
    </div>
  );
}
