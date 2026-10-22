import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ theme = "light", ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      closeButton
      // Clear the fixed forecast shortcut through its lg breakpoint, including
      // tablets wider than Sonner's own mobile breakpoint and device safe areas.
      offset={{ bottom: "var(--workspace-toast-offset)" }}
      mobileOffset={{ bottom: "var(--workspace-toast-offset)" }}
      className="toaster group [--workspace-toast-offset:calc(7rem+env(safe-area-inset-bottom))] lg:[--workspace-toast-offset:calc(1.5rem+env(safe-area-inset-bottom))]"
      toastOptions={{
        classNames: {
          toast: "rounded-lg border bg-popover text-popover-foreground shadow-lg",
        },
      }}
      {...props}
    />
  );
}
