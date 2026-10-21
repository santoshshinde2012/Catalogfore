import { useEffect, useState } from "react";
import { prefetchIdleRoutes } from "./route-prefetch";
import { ShortcutsDialog } from "./shortcuts-dialog";

const SHORTCUTS_EVENT = "catalogfore-shortcuts";

export function openShortcuts() {
  window.dispatchEvent(new Event(SHORTCUTS_EVENT));
}

export function WorkspaceAssist({
  onPlan,
  onProducts,
  onRates,
  onForecast,
}: {
  onPlan: () => void;
  onProducts: () => void;
  onRates: () => void;
  onForecast: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    prefetchIdleRoutes();
    const show = () => setOpen(true);
    window.addEventListener(SHORTCUTS_EVENT, show);
    return () => window.removeEventListener(SHORTCUTS_EVENT, show);
  }, []);
  useEffect(() => {
    const actions: Record<string, () => void> = { "1": onPlan, "2": onProducts, "3": onRates, "4": onForecast };
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "?" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        if (typing) return;
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || typing) return;
      const run = actions[event.key];
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPlan, onProducts, onRates, onForecast]);
  return <ShortcutsDialog open={open} onOpenChange={setOpen} />;
}
