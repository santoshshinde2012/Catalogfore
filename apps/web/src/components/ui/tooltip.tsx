import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Slot } from "@radix-ui/react-slot";
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactElement } from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    // Require an intentional hover on each control when moving across dense toolbars.
    <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={0} {...props}>
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
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    let pointerEngaged = Boolean(trigger.current?.matches(":hover") || content.current?.matches(":hover"));
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const triggerElement = trigger.current;
      const contentElement = content.current;
      if (!triggerElement || !contentElement) return;
      const target = event.target;
      if (target instanceof Node && (triggerElement.contains(target) || contentElement.contains(target))) {
        pointerEngaged = true;
        return;
      }
      if (!pointerEngaged) return;
      const triggerBounds = triggerElement.getBoundingClientRect();
      const contentBounds = contentElement.getBoundingClientRect();
      // Enclose Radix's trigger-to-content grace area, including its five-pixel exit padding.
      const padding = 5;
      if (
        event.clientX < Math.min(triggerBounds.left, contentBounds.left) - padding ||
        event.clientX > Math.max(triggerBounds.right, contentBounds.right) + padding ||
        event.clientY < Math.min(triggerBounds.top, contentBounds.top) - padding ||
        event.clientY > Math.max(triggerBounds.bottom, contentBounds.bottom) + padding
      ) {
        setOpen(false);
      }
    };
    // Install before a fast exit: Radix creates its own transit listener after pointerleave.
    document.addEventListener("pointermove", onPointerMove);
    return () => document.removeEventListener("pointermove", onPointerMove);
  }, [open]);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <TooltipTarget ref={trigger}>{children}</TooltipTarget>
      </TooltipTrigger>
      <TooltipContent ref={content} side={side} align={align}>
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
