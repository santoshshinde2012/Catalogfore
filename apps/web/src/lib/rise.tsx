import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Rise({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  // Prerendered HTML is already visible. Replaying the entrance would hide the year total and miss hydration.
  const painted = typeof document !== "undefined" && document.getElementById("root")?.hasAttribute("data-prerender");
  const still = reduce || painted;
  return (
    <motion.div
      className={className}
      initial={still ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: still ? 0 : 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
