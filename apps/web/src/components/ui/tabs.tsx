import * as TabsPrimitive from "@radix-ui/react-tabs";
import { createContext, useContext, useId, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { StripPresence } from "./segmented-strip";

const TabsStripContext = createContext("tabs");

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const layoutId = useId();
  return (
    <TabsStripContext.Provider value={layoutId}>
      <TabsPrimitive.List
        className={cn(
          "inline-flex overflow-hidden rounded-xl border border-border bg-card text-muted-foreground",
          className,
        )}
        {...props}
      />
    </TabsStripContext.Provider>
  );
}

export function TabsTrigger({ className, children, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const layoutId = useContext(TabsStripContext);
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "strip-item relative inline-flex min-h-11 min-w-16 items-center justify-center border-l border-border px-4 text-sm font-medium text-muted-foreground first:border-l-0 hover:text-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    >
      <StripPresence layoutId={layoutId} edge="bottom" />
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
}
