import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function ConnectionStatus() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const wasOffline = useRef(offline);
  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      if (wasOffline.current) toast.success("Back online");
      wasOffline.current = false;
    };
    const onOffline = () => {
      wasOffline.current = true;
      setOffline(true);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  if (!offline) return null;
  return (
    <p role="status" data-testid="offline-banner" className="border-b bg-card px-4 py-2 text-sm text-foreground">
      You’re offline. This planner still uses the prices already in the page. Samples and newly shared links need a
      connection.
    </p>
  );
}
