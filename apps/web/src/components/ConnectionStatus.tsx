import { useOfflineNotice } from "../hooks/use-online";
import { sonnerNotifier } from "../services/sonner-notifier";
import type { NetworkStatus } from "../services/ports";
import type { Notifier } from "../services/notices";

export function ConnectionStatus({
  network,
  notifier = sonnerNotifier,
}: {
  network?: NetworkStatus;
  notifier?: Notifier;
}) {
  const offline = useOfflineNotice(network, notifier);
  if (!offline) return null;
  return (
    <p role="status" data-testid="offline-banner" className="border-b bg-card px-4 py-2 text-sm text-foreground">
      You’re offline. This planner still uses the prices already in the page. Samples and newly shared links need a
      connection.
    </p>
  );
}
