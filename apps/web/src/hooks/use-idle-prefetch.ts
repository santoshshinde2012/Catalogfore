import { useEffect } from "react";
import type { PrefetchPort } from "../services/prefetch-plan";

export function useIdlePrefetch(prefetch: PrefetchPort) {
  useEffect(() => prefetch.warmIdle(), [prefetch]);
}
