import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChartNoAxesColumnIncreasing, Download, ListFilter, ShieldCheck } from "lucide-react";

const panels = [
  { value: "rates", label: "Rates & calculator", icon: ListFilter },
  { value: "compare", label: "Compare regions", icon: ChartNoAxesColumnIncreasing },
  { value: "evidence", label: "Evidence", icon: ShieldCheck },
  { value: "downloads", label: "Downloads", icon: Download },
] as const;

export function RateWorkspaceTabs() {
  return (
    <TabsPrimitive.List
      aria-label="Unit cost workspace"
      className="grid grid-cols-2 gap-x-4 border-b sm:flex sm:gap-x-6"
    >
      {panels.map(({ value, label, icon: Icon }) => (
        <TabsPrimitive.Trigger
          key={value}
          value={value}
          className="relative inline-flex min-h-11 items-center justify-center gap-2 border-b-2 border-transparent px-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-lava data-[state=active]:text-foreground sm:justify-start sm:text-sm"
        >
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          {label}
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
  );
}
