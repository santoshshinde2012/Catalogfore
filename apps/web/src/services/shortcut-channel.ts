const SHORTCUTS_EVENT = "catalogfore-shortcuts";

export function openShortcuts() {
  window.dispatchEvent(new Event(SHORTCUTS_EVENT));
}

export function subscribeShortcuts(listener: () => void) {
  window.addEventListener(SHORTCUTS_EVENT, listener);
  return () => window.removeEventListener(SHORTCUTS_EVENT, listener);
}
