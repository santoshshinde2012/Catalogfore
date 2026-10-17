import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider delayDuration={250} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-[60] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border bg-popover px-3.5 py-3 text-xs leading-relaxed text-popover-foreground shadow-[0_8px_32px_rgb(0_0_0/0.14)] data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** One accessible trigger with optional, noninteractive contextual help. */
export function InfoTooltip({
  label,
  description,
  children,
  side = "bottom",
  align = "center",
}: {
  label: string;
  description?: string;
  children: ReactElement;
  side?: ComponentProps<typeof TooltipPrimitive.Content>["side"];
  align?: ComponentProps<typeof TooltipPrimitive.Content>["align"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TooltipTarget>{children}</TooltipTarget>
      </TooltipTrigger>
      <TooltipContent side={side} align={align}>
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-1 block text-muted-foreground">{description}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

// Preserve a composed tab or menu trigger's own data-state while forwarding help and events.
function TooltipTarget({
  "data-state": _tooltipState,
  ...props
}: ComponentProps<typeof Slot> & { "data-state"?: string }) {
  return <Slot {...props} />;
}
