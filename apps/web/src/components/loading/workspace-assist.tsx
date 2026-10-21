import { useEffect, useRef, useState } from "react";
import { prefetch } from "./route-loaders";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { useIdlePrefetch } from "../../hooks/use-idle-prefetch";
import { focusedElement } from "../../hooks/use-return-focus";
import { useShortcuts } from "../../hooks/use-shortcuts";
import { subscribeShortcuts } from "../../services/shortcut-channel";
import type { ShortcutAction } from "../../services/shortcuts";

type Destination = Exclude<ShortcutAction, "help">;

export function WorkspaceAssist({ onNavigate }: { onNavigate: (action: Destination) => void }) {
  const [open, setOpen] = useState(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;
  useIdlePrefetch(prefetch);
  function showHelp() {
    returnTo.current = focusedElement();
    setOpen(true);
  }
  useEffect(() => subscribeShortcuts(showHelp), []);
  useShortcuts({
    plan: () => navigateRef.current("plan"),
    products: () => navigateRef.current("products"),
    rates: () => navigateRef.current("rates"),
    forecast: () => navigateRef.current("forecast"),
    help: showHelp,
  });
  return (
    <ShortcutsDialog
      open={open}
      onOpenChange={setOpen}
      onCloseAutoFocus={(event) => {
        const node = returnTo.current;
        if (!node) return;
        event.preventDefault();
        node.focus();
      }}
    />
  );
}
