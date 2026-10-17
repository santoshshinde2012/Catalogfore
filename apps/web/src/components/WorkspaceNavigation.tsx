import { cn } from "../lib/utils";
import { primaryNavigation, type NavigationActions } from "./header-navigation";
import { Button } from "./ui/button";
import { InfoTooltip } from "./ui/tooltip";

export function WorkspaceNavigation({
  actions,
  productMapOpen,
  unitCostsOpen,
  compact = false,
}: {
  actions: NavigationActions;
  productMapOpen: boolean;
  unitCostsOpen: boolean;
  compact?: boolean;
}) {
  const current = productMapOpen ? "products" : unitCostsOpen ? "rates" : "inputs";
  return (
    <nav
      aria-label="Workspace"
      className={cn(
        compact ? "grid h-13 grid-cols-3 px-4 pt-0.5 pb-1.5 md:hidden" : "hidden items-center gap-5 md:flex",
      )}
    >
      {primaryNavigation.map(({ id, label, description }) => (
        <InfoTooltip key={id} label={label} description={description}>
          <Button
            type="button"
            variant="ghost"
            aria-current={id === current ? "page" : undefined}
            className={cn(
              "group relative min-h-11 min-w-0 rounded-none px-3.5 text-[13px] text-muted-foreground hover:bg-transparent hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground",
              compact && "px-2 text-xs",
            )}
            onClick={actions[id]}
          >
            <span className="relative py-1">
              {label}
              <span
                className={cn(
                  "absolute -bottom-1.5 inset-x-0 h-0.5 bg-lava transition-opacity motion-reduce:transition-none",
                  id === current ? "opacity-100" : "opacity-0 group-hover:opacity-30",
                )}
                aria-hidden="true"
              />
            </span>
          </Button>
        </InfoTooltip>
      ))}
    </nav>
  );
}
