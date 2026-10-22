import { useEffect, useRef } from "react";
import { matchingShortcut, type ShortcutAction } from "../services/shortcuts";

/** One listener for the shortcut registry. Handlers are read when the key is pressed. */
export function useShortcuts(handlers: Partial<Record<ShortcutAction, () => void>>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const shortcut = matchingShortcut(event);
      const run = shortcut ? handlersRef.current[shortcut.action] : undefined;
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
