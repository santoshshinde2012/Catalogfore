import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring sm:h-10 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
