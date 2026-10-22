export const shortcutActions = ["plan", "products", "rates", "forecast", "help"] as const;
export type ShortcutAction = (typeof shortcutActions)[number];

export interface Shortcut {
  id: string;
  keys: string;
  label: string;
  action: ShortcutAction;
  when: (event: KeyboardEvent) => boolean;
}

const TEXT_ENTRY = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function altDigit(key: string) {
  return (event: KeyboardEvent) =>
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.code === `Digit${key}` || event.key === key);
}

/** Shortcuts in display order. Matching walks this list; it does not branch per key. */
export const shortcuts: readonly Shortcut[] = [
  { id: "plan", keys: "Alt+1", label: "Plan", action: "plan", when: altDigit("1") },
  { id: "products", keys: "Alt+2", label: "Product map", action: "products", when: altDigit("2") },
  { id: "rates", keys: "Alt+3", label: "Unit costs", action: "rates", when: altDigit("3") },
  { id: "forecast", keys: "Alt+4", label: "Forecast", action: "forecast", when: altDigit("4") },
  {
    id: "help",
    keys: "?",
    label: "Open this list",
    action: "help",
    when: (event) => event.key === "?" && !event.altKey && !event.ctrlKey && !event.metaKey,
  },
];

export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.contentEditable === "true") return true;
  if (TEXT_ENTRY.has(target.tagName)) return true;
  return target.getAttribute("role") === "textbox";
}

export function matchingShortcut(event: KeyboardEvent): Shortcut | undefined {
  if (event.defaultPrevented || event.repeat || event.isComposing || isTextEntry(event.target)) return undefined;
  // Open dialogs and menus own their keyboard interaction until focus returns
  // to the workspace.
  if (
    event.target instanceof Element &&
    event.target.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')
  )
    return undefined;
  return shortcuts.find((shortcut) => shortcut.when(event));
}
