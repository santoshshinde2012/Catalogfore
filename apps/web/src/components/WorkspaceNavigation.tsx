import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { InfoTooltip } from "./ui/tooltip";
import { headerNavigation, type NavigationActions } from "./WorkspaceMenu";

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
  const items = compact
    ? headerNavigation.filter(({ id }) => ["inputs", "products", "rates"].includes(id))
    : headerNavigation;
  return (
    <nav
      aria-label={compact ? "Workspace" : "Page"}
      className={cn(
        compact
          ? "mx-auto grid w-full max-w-7xl grid-cols-3 gap-1 px-4 py-1.5 sm:px-6"
          : "ml-auto hidden items-center gap-0.5 rounded-2xl border bg-muted/50 p-1 xl:flex",
      )}
    >
      {items.map(({ id, label, description, icon: Icon }) => (
        <InfoTooltip key={id} label={label} description={description}>
          <Button
            type="button"
            variant="ghost"
            aria-label={label}
            aria-haspopup={id === "advanced" ? "dialog" : undefined}
            aria-current={id === current ? "page" : undefined}
            className={cn(
              "min-w-0 gap-1.5 rounded-xl px-2 text-xs text-muted-foreground hover:bg-card hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:text-link aria-[current=page]:shadow-sm",
              compact ? "min-h-11" : "min-h-10",
            )}
            onClick={actions[id]}
          >
            <Icon className={cn("size-3.5 shrink-0", compact && "hidden min-[400px]:block")} aria-hidden="true" />
            {label}
          </Button>
        </InfoTooltip>
      ))}
    </nav>
  );
}
