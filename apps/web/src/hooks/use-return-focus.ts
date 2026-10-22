import { useEffect, useRef, type RefObject } from "react";

/** Restore focus lost to a disabled button without interrupting another control. */
export function useReturnFocus(busy: boolean, target: RefObject<HTMLElement | null>) {
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy && document.activeElement === document.body) target.current?.focus();
    wasBusy.current = busy;
  }, [busy, target]);
}

export function focusedElement(): HTMLElement | null {
  const node = document.activeElement;
  return node instanceof HTMLElement && node !== document.body ? node : null;
}
