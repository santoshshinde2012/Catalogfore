import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Rise({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
