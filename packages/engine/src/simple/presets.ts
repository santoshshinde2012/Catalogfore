import type { WorkloadMix } from "../types.js";

export type TeamPresetId = "small" | "medium" | "large";

export interface TeamPreset {
  id: TeamPresetId;
  label: string;
  monthlySpend: number;
  mix: WorkloadMix;
  detail: string;
}

export const TEAM_PRESETS: readonly TeamPreset[] = [
  {
    id: "small",
    label: "Small",
    monthlySpend: 2_000,
    mix: { etl: 0.35, sql: 0.55, ml: 0.1 },
    detail: "Nightly pipelines and a shared dashboard.",
  },
  {
    id: "medium",
    label: "Medium",
    monthlySpend: 12_000,
    mix: { etl: 0.45, sql: 0.4, ml: 0.15 },
    detail: "Pipelines lead, with dashboards and a little model use.",
  },
  {
    id: "large",
    label: "Large",
    monthlySpend: 25_000,
    mix: { etl: 0.4, sql: 0.3, ml: 0.3 },
    detail: "A platform bill with a real share of model usage.",
  },
];

export const GROWTH_PRESETS = [0, 0.03, 0.05, 0.1] as const;

export function teamPreset(id: TeamPresetId): TeamPreset {
  return TEAM_PRESETS.find((preset) => preset.id === id) ?? TEAM_PRESETS[1];
}
