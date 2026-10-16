import { AppShell } from "./components/AppShell";
import { useSimpleForecast } from "./hooks/useSimpleForecast";

export function App() {
  const session = useSimpleForecast();
  return <AppShell session={session} />;
}
