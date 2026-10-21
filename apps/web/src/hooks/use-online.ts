import { useEffect, useRef, useState } from "react";
import { browserNetwork } from "../services/browser-ports";
import { connectionStep } from "../services/connection";
import { notices, type Notifier } from "../services/notices";
import type { NetworkStatus } from "../services/ports";
import { showNotice } from "../services/sonner-notifier";

export function useOnline(network?: NetworkStatus): boolean {
  const source = network ?? browserNetwork;
  const [online, setOnline] = useState(() => source.online());
  useEffect(() => source.subscribe(setOnline), [source]);
  return online;
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
