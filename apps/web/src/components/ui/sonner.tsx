import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ theme = "light", ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "rounded-lg border bg-popover text-popover-foreground shadow-lg",
        },
      }}
      {...props}
    />
  );
}
