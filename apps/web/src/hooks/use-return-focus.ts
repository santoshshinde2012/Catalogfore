import { useEffect, useRef, type RefObject } from "react";

/** Disabled buttons drop focus. Put it back on the control that was working. */
export function useReturnFocus(busy: boolean, target: RefObject<HTMLElement | null>) {
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy) target.current?.focus();
    wasBusy.current = busy;
  }, [busy, target]);
}

export function focusedElement(): HTMLElement | null {
  const node = document.activeElement;
  return node instanceof HTMLElement && node !== document.body ? node : null;
}
