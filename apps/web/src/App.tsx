import { AppShell } from "./components/AppShell";
import { useForecastSession } from "./hooks/useForecastSession";

export function App() {
  const session = useForecastSession();
  return <AppShell session={session} />;
}
