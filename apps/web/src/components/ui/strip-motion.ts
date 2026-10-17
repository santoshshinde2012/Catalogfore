import type { Transition } from "framer-motion";

/** Spring for the sliding pill. Reduced motion snaps instead of sliding. */
export function stripTransition(reduce: boolean | null): Transition {
  if (reduce) return { duration: 0 };
  return { type: "spring", stiffness: 520, damping: 36, mass: 0.7 };
}
