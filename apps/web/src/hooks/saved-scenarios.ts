import { parseSavedForecast, parseUntrustedJson, type Portfolio } from "@cayfore/engine";
import { useState } from "react";
import { browserStore } from "../services/browser-ports";
import type { KeyValueStore } from "../services/ports";

export interface SavedScenario {
  id: string;
  name: string;
  portfolio: Portfolio;
}
export const SCENARIO_STORAGE_KEY = "cayfore:scenarios:v1";
const MAX_SCENARIOS = 20;

function readScenarios(store: KeyValueStore): SavedScenario[] {
  try {
    const raw = store.get(SCENARIO_STORAGE_KEY);
    if (!raw) return [];
    const saved: unknown = parseUntrustedJson(raw);
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, MAX_SCENARIOS).flatMap((value: unknown) => {
      if (!value || typeof value !== "object" || !("id" in value) || !("name" in value) || !("portfolio" in value))
        return [];
      if (typeof value.id !== "string" || typeof value.name !== "string") return [];
      const parsed = parseSavedForecast(value.portfolio);
      return parsed.ok ? [{ id: value.id.slice(0, 80), name: value.name.slice(0, 80), portfolio: parsed.value }] : [];
    });
  } catch {
    return [];
  }
}

export function useSavedScenarios(
  portfolio: Portfolio,
  load: (portfolio: Portfolio) => void,
  notice: (text: string) => void,
  store: KeyValueStore = browserStore,
) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => readScenarios(store));
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [removed, setRemoved] = useState<{ scenario: SavedScenario; index: number; compared: boolean } | null>(null);
  function persist(next: SavedScenario[]) {
    setScenarios(next);
    try {
      store.set(SCENARIO_STORAGE_KEY, JSON.stringify(next));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
      notice("Scenarios are available this session. Browser storage is unavailable; export JSON to keep a copy.");
    }
  }
  function save(name: string, source: Portfolio) {
    if (scenarios.length >= MAX_SCENARIOS) {
      notice(`You have ${MAX_SCENARIOS} saved scenarios. Remove one before saving another.`);
      return;
    }
    const title = name.trim().slice(0, 80) || `Scenario ${scenarios.length + 1}`;
    persist([
      ...scenarios,
      { id: crypto.randomUUID(), name: title, portfolio: structuredClone({ ...source, name: title }) },
    ]);
  }
  return {
    scenarios,
    scenarioStorageAvailable: storageAvailable,
    canUndoScenarioDelete: removed !== null && scenarios.length < MAX_SCENARIOS,
    comparison: scenarios.find((item) => item.id === comparisonId) ?? null,
    saveScenario: (name: string) => save(name, portfolio),
    loadScenario: (id: string) => {
      const item = scenarios.find((scenario) => scenario.id === id);
      if (item) load(structuredClone(item.portfolio));
    },
    duplicateScenario: (id: string, name?: string) => {
      const item = scenarios.find((scenario) => scenario.id === id);
      if (item) save(name ?? `${item.name} copy`, item.portfolio);
    },
    removeScenario: (id: string) => {
      const index = scenarios.findIndex((item) => item.id === id);
      if (index === -1) return;
      setRemoved({ scenario: scenarios[index], index, compared: id === comparisonId });
      persist(scenarios.filter((item) => item.id !== id));
      if (id === comparisonId) setComparisonId(null);
    },
    undoScenarioDelete: () => {
      if (!removed || scenarios.length >= MAX_SCENARIOS) return;
      const next = [...scenarios];
      next.splice(Math.min(removed.index, next.length), 0, removed.scenario);
      persist(next);
      if (removed.compared) setComparisonId((current) => current ?? removed.scenario.id);
      setRemoved(null);
    },
    compareScenario: (id: string | null) => setComparisonId(id),
  };
}
