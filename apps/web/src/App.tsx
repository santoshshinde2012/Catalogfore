import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { useSimpleForecast } from "./hooks/useSimpleForecast";

export function App() {
  const session = useSimpleForecast();
  useEffect(() => {
    // The prerender is readable before its handlers and saved-plan state exist.
    // Enable interaction only after the session's initial effects have run.
    const root = document.getElementById("root");
    if (!root) return;
    root.inert = false;
    root.removeAttribute("aria-busy");
    document.getElementById("startup-status")?.remove();
  }, []);
  return <AppShell session={session} />;
}
