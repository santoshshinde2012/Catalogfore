import type { Scheduler } from "./ports";

export const prefetchTargets = ["products", "rates", "advanced", "chart", "composition"] as const;
export type PrefetchTarget = (typeof prefetchTargets)[number];

/** Chunks warmed after first paint. Product routes stay on hover so a failed navigation can still surface. */
export const idlePrefetchTargets: readonly PrefetchTarget[] = ["chart", "composition", "advanced"];

export const navigationPrefetch: Readonly<Record<string, PrefetchTarget>> = {
  products: "products",
  rates: "rates",
  inputs: "chart",
};

const IDLE_TIMEOUT_MS = 1800;
const IDLE_FALLBACK_MS = 400;

export interface PrefetchPort {
  warm(target: PrefetchTarget): void;
  warmNavigation(id: string): void;
  warmIdle(): () => void;
}

export function createPrefetch(
  loaders: Record<PrefetchTarget, () => Promise<unknown>>,
  scheduler: Pick<Scheduler, "idle">,
): PrefetchPort {
  const pending = new Map<PrefetchTarget, Promise<unknown>>();
  function warm(target: PrefetchTarget) {
    if (pending.has(target)) return;
    pending.set(
      target,
      loaders[target]().catch(() => undefined),
    );
  }
  return {
    warm,
    warmNavigation(id) {
      const target = navigationPrefetch[id];
      if (target) warm(target);
    },
    warmIdle: () => scheduler.idle(() => idlePrefetchTargets.forEach(warm), IDLE_TIMEOUT_MS, IDLE_FALLBACK_MS),
  };
}
