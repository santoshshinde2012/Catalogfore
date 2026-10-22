import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { browserNetwork } from "../services/browser-ports";
import { connectionStep } from "../services/connection";
import { notices, type Notifier } from "../services/notices";
import type { NetworkStatus } from "../services/ports";
import { showNotice } from "../services/sonner-notifier";

// The static landing page has no browser connection state. Hydration must start
// with the same snapshot, then subscribe to the actual browser status.
const serverOnline = () => true;

export function useOnline(network?: NetworkStatus): boolean {
  const source = network ?? browserNetwork;
  const subscribe = useCallback((listener: () => void) => source.subscribe(listener), [source]);
  const getSnapshot = useCallback(() => source.online(), [source]);
  return useSyncExternalStore(subscribe, getSnapshot, serverOnline);
}

/** Offline flag, plus a single “back online” notice on the recovery edge. */
export function useOfflineNotice(network?: NetworkStatus, notifier?: Notifier): boolean {
  const online = useOnline(network);
  const wasOffline = useRef(!online);
  useEffect(() => {
    const step = connectionStep(wasOffline.current, online);
    wasOffline.current = step.offline;
    if (step.announce && notifier) showNotice(notices.backOnline(), notifier);
  }, [online, notifier]);
  return !online;
}
