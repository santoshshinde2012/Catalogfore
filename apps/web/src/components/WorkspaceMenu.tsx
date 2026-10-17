import {
  BookOpen,
  ChartNoAxesCombined,
  CircleDollarSign,
  ChevronDown,
  Menu,
  Network,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { InfoTooltip } from "./ui/tooltip";

export const headerNavigation = [
  {
    id: "inputs",
    label: "Plan",
    menuLabel: "Edit inputs",
    description: "Choose your cloud, baseline spend, and growth assumptions.",
    icon: SlidersHorizontal,
  },
  {
    id: "forecast",
    label: "Forecast",
    menuLabel: "Forecast",
    description: "Explore monthly spend, cost drivers, and your 12-month outlook.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "advanced",
    label: "Advanced",
    menuLabel: "Advanced",
    description: "Build the same forecast in detail, one Databricks workload at a time.",
    icon: Sparkles,
  },
  {
    id: "products",
    label: "Product map",
    menuLabel: "Product map",
    description: "Explore Databricks products, services, and the domains they connect.",
    icon: Network,
  },
  {
    id: "rates",
    label: "Unit costs",
    menuLabel: "Unit costs",
    description: "Inspect source rates, billing dimensions, and quantity calculations; download CSV or JSON.",
    icon: CircleDollarSign,
  },
  {
    id: "how",
    label: "How it works",
    menuLabel: "How it works",
    description: "Review the pricing sources, assumptions, and limits behind your estimate.",
    icon: BookOpen,
  },
] as const;

export type NavigationActions = Record<(typeof headerNavigation)[number]["id"], () => void>;

export function WorkspaceMenu({
  actions,
  onNew,
  productMapOpen = false,
  unitCostsOpen = false,
}: {
  actions: NavigationActions;
  onNew: () => void;
  productMapOpen?: boolean;
  unitCostsOpen?: boolean;
}) {
  const menuAction = useRef<(() => void) | null>(null);
  const current = productMapOpen ? "products" : unitCostsOpen ? "rates" : "inputs";
  return (
    <DropdownMenu modal={false}>
      <InfoTooltip label="Workspace menu" description="Navigate the planner or start a fresh forecast." align="end">
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
            aria-label="Menu"
          >
            <Menu aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
      </InfoTooltip>
      <DropdownMenuContent
        align="end"
        regionLabel="Workspace menu"
        collisionPadding={12}
        className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl p-2 shadow-xl"
        onCloseAutoFocus={(event) => {
          const action = menuAction.current;
          if (!action) return;
          event.preventDefault();
          menuAction.current = null;
          requestAnimationFrame(action);
        }}
      >
        <div className="px-3 pt-2 pb-3" aria-hidden="true">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Your workspace</p>
          <p className="mt-1 text-sm font-semibold">A clearer view of your costs</p>
        </div>
        <div role="separator" className="mb-1 h-px bg-border" />
        {headerNavigation.map(({ id, menuLabel, description, icon: Icon }) => (
          <DropdownMenuItem
            key={id}
            className="items-start gap-3 rounded-xl px-3 py-3 aria-[current=page]:bg-muted aria-[current=page]:text-link"
            aria-haspopup={id === "advanced" ? "dialog" : undefined}
            aria-current={id === current ? "page" : undefined}
            onSelect={() => {
              menuAction.current = actions[id];
            }}
          >
            <MenuIcon icon={Icon} />
            <span className="min-w-0">
              <span className="block font-medium">{menuLabel}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <div role="separator" className="my-1 h-px bg-border" />
        <DropdownMenuItem
          className="items-start gap-3 rounded-xl px-3 py-3"
          onSelect={() => {
            menuAction.current = onNew;
          }}
        >
          <MenuIcon icon={RotateCcw} />
          <span>
            <span className="block font-medium">New forecast</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              Start with the default plan. Undo can restore your previous work.
            </span>
          </span>
        </DropdownMenuItem>
        <div
          className="mx-1 mt-1 flex items-center justify-between border-t px-2 pt-2 pb-1 text-[11px] text-muted-foreground"
          aria-hidden="true"
        >
          <span>Plan with confidence</span>
          <span className="flex items-center gap-1">
            <ChevronDown className="size-3" aria-hidden="true" /> Navigate · Esc Close
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground"
      aria-hidden="true"
    >
      <Icon className="size-4" />
    </span>
  );
}
