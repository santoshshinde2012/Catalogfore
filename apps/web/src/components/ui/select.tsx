import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "group flex h-11 min-w-0 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-base font-normal text-foreground shadow-none outline-none transition-colors hover:border-foreground/25 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring sm:h-10 sm:text-sm",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  header,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content> & { header?: ReactNode }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "z-50 flex max-h-[min(22rem,var(--radix-select-content-available-height))] w-[max(var(--radix-select-trigger-width),18rem)] max-w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-[0_12px_48px_rgb(11_32_38/0.16)]",
          className,
        )}
        {...props}
      >
        {header}
        <SelectPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center rounded-lg py-2 pr-8 pl-2.5 text-left text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[state=checked]:font-medium sm:min-h-9",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 text-link">
        <Check className="size-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
