import { parseSavedForecast, parseUntrustedJson, type Portfolio } from "@cayfore/engine";
import { useState } from "react";

export interface SavedScenario {
  id: string;
  name: string;
  portfolio: Portfolio;
}
export const SCENARIO_STORAGE_KEY = "cayfore:scenarios:v1";
const MAX_SCENARIOS = 20;

function readScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
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
) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(readScenarios);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  function persist(next: SavedScenario[]) {
    setScenarios(next);
    try {
      localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next));
    } catch {
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
      persist(scenarios.filter((item) => item.id !== id));
      if (id === comparisonId) setComparisonId(null);
    },
    compareScenario: (id: string | null) => setComparisonId(id),
  };
}
