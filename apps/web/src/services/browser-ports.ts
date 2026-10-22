import type { ClipboardPort, Clock, KeyValueStore, MotionQuery, NetworkStatus, Scheduler, TextFetcher } from "./ports";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const browserClock: Clock = {
  now: () => performance.now(),
  today: () => new Date().toISOString().slice(0, 10),
};

export const browserScheduler: Scheduler = {
  frame: (task) => requestAnimationFrame(task),
  cancel: (id) => cancelAnimationFrame(id),
  later: (task, delayMs) => window.setTimeout(task, delayMs),
  clear: (id) => window.clearTimeout(id),
  idle(task, timeoutMs, fallbackMs) {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => task(), { timeout: timeoutMs });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(task, fallbackMs);
    return () => window.clearTimeout(id);
  },
};

export const browserNetwork: NetworkStatus = {
  online: () => navigator.onLine,
  subscribe(listener) {
    const sync = () => listener(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  },
};

export const browserClipboard: ClipboardPort = {
  writeText: (value) => navigator.clipboard.writeText(value),
};

/** Throws when storage is blocked. Callers decide how to continue. */
export const browserStore: KeyValueStore = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
};

export const browserMotion: MotionQuery = {
  matches: () => window.matchMedia(MOTION_QUERY).matches,
  subscribe(listener) {
    const media = window.matchMedia(MOTION_QUERY);
    const onChange = () => listener(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  },
};

export const browserFetcher: TextFetcher = {
  async getText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("missing");
    return response.text();
  },
};
