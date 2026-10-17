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
        compact
          ? "grid h-13 grid-cols-3 gap-1 px-4 pt-0.5 pb-1.5 md:hidden"
          : "hidden items-center gap-1 rounded-full border border-border/70 bg-muted/65 p-1 md:flex",
      )}
    >
      {primaryNavigation.map(({ id, label, description }) => (
        <InfoTooltip key={id} label={label} description={description}>
          <Button
            type="button"
            variant="ghost"
            aria-current={id === current ? "page" : undefined}
            className={cn(
              "relative min-h-11 min-w-0 rounded-full px-3 text-[13px] text-muted-foreground hover:bg-card/70 hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[0_1px_4px_rgb(11_32_38/0.08)]",
              compact ? "gap-1.5 px-2 text-xs" : "gap-2.5",
            )}
            onClick={actions[id]}
          >
            <span
              className={cn("size-1.5 shrink-0 rounded-full", id === current ? "bg-lava" : "bg-transparent")}
              aria-hidden="true"
            />
            {label}
          </Button>
        </InfoTooltip>
      ))}
    </nav>
  );
}
