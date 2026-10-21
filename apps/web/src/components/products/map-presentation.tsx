import type { ProductMapEntry } from "@cayfore/catalog/map";
import {
  AppWindow,
  BrainCircuit,
  ChartNoAxesCombined,
  Layers3,
  Network,
  ShieldCheck,
  Unplug,
  Workflow,
} from "lucide-react";
import { cn } from "../../lib/utils";

const icons = {
  ingestion: Unplug,
  engineering: Workflow,
  analytics: ChartNoAxesCombined,
  ai_ml: BrainCircuit,
  apps: AppWindow,
  governance: ShieldCheck,
  sharing: Network,
  platform: Layers3,
};
const colors: Record<string, string> = {
  ingestion: "border-teal-500/25 bg-teal-500/10 text-teal-900 dark:text-teal-200",
  engineering: "border-blue-500/25 bg-blue-500/10 text-blue-900 dark:text-blue-200",
  analytics: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  ai_ml: "border-violet-500/25 bg-violet-500/10 text-violet-900 dark:text-violet-200",
  apps: "border-rose-500/25 bg-rose-500/10 text-rose-900 dark:text-rose-200",
  governance: "border-cyan-500/25 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200",
  sharing: "border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  platform: "border-border bg-muted text-muted-foreground",
};

export function domainColor(id: string) {
  return colors[id] ?? colors.platform;
}
export function DomainIcon({ id, className }: { id: string; className?: string }) {
  const Icon = icons[id as keyof typeof icons] ?? Layers3;
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden="true" />;
}
export function coverageLabel(entry: ProductMapEntry): string {
  if (!entry.product) return "Platform concept";
  if (entry.product.listPrice === "unpublished") return "No catalog rate";
  return entry.product.listPrice === "reused_sku" ? "Uses underlying SKUs" : "Catalog rate";
}
export function CoverageBadge({ entry }: { entry: ProductMapEntry }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        entry.product?.listPrice === "unpublished"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {coverageLabel(entry)}
    </span>
  );
}
