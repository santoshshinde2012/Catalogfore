import { Building2, Landmark, Users, type LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { Cloud, SimplePlan, TeamPresetId, Tier, WorkloadMix } from "@cayfore/engine";
import { TEAM_PRESETS } from "@cayfore/engine";

export function Step({
  n,
  title,
  disabled,
  children,
}: {
  n: string;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-4" disabled={disabled}>
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function MixBar({
  mix,
  disabled,
  onMix,
}: {
  mix: WorkloadMix;
  disabled: boolean;
  onMix: (key: keyof WorkloadMix, value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function share(clientX: number): number {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }
  return (
    <div className="relative h-3" aria-hidden="true">
      <div
        ref={ref}
        className="flex h-full overflow-hidden rounded-full bg-muted"
        onPointerDown={(event) => {
          if (disabled) return;
          const start = share(event.clientX);
          const boundary = mix.etl + mix.sql;
          const key: keyof WorkloadMix = Math.abs(start - mix.etl) <= Math.abs(start - boundary) ? "etl" : "ml";
          const apply = (clientX: number) => {
            const next = share(clientX);
            onMix(key, key === "etl" ? next : 1 - next);
          };
          apply(event.clientX);
          const move = (pointer: PointerEvent) => apply(pointer.clientX);
          const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", stop);
        }}
      >
        <span className="bg-lava" style={{ width: `${mix.etl * 100}%` }} />
        <span className="bg-[#146c43]" style={{ width: `${mix.sql * 100}%` }} />
        <span className="bg-[#b45309]" style={{ width: `${mix.ml * 100}%` }} />
      </div>
      <span
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card shadow-sm"
        style={{ left: `${mix.etl * 100}%` }}
      />
      <span
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card shadow-sm"
        style={{ left: `${(mix.etl + mix.sql) * 100}%` }}
      />
    </div>
  );
}

export function AwsGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M2 4h12M2 8h8M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AzureGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.5v7M4.5 8h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function GcpGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        d="M8 2.2 13 5.1v5.8L8 13.8 3 10.9V5.1L8 2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function describePreset(plan: SimplePlan): string {
  const match = TEAM_PRESETS.find(
    (preset) =>
      Math.abs(plan.mix.etl - preset.mix.etl) < 0.02 &&
      Math.abs(plan.mix.sql - preset.mix.sql) < 0.02 &&
      Math.abs(plan.mix.ml - preset.mix.ml) < 0.02,
  );
  return match ? match.detail : "Custom mix.";
}

export function pressedPreset(plan: SimplePlan, listMonthly: number, usageLocked: boolean): TeamPresetId | null {
  if (usageLocked) return null;
  const match = TEAM_PRESETS.find(
    (preset) =>
      Math.abs(plan.mix.etl - preset.mix.etl) < 0.02 &&
      Math.abs(plan.mix.sql - preset.mix.sql) < 0.02 &&
      Math.abs(plan.mix.ml - preset.mix.ml) < 0.02 &&
      Math.abs(listMonthly - preset.monthlySpend) < 50,
  );
  return match?.id ?? null;
}

export const GROWTH = [0, 0.03, 0.05, 0.1];

export function growthValue(rate: number): string {
  const match = GROWTH.find((preset) => Math.abs(rate - preset) < 0.0005);
  return match === undefined ? "" : String(match);
}

export const CLOUDS: { id: Cloud; label: string; glyph: ReactNode }[] = [
  { id: "aws", label: "AWS", glyph: <AwsGlyph /> },
  { id: "azure", label: "Azure", glyph: <AzureGlyph /> },
  { id: "gcp", label: "GCP", glyph: <GcpGlyph /> },
];

export const TIERS: { id: Tier; label: string }[] = [
  { id: "premium", label: "Premium" },
  { id: "enterprise", label: "Enterprise" },
];

export const MIX_FIELDS: { key: keyof WorkloadMix; label: string }[] = [
  { key: "etl", label: "Pipelines" },
  { key: "sql", label: "Dashboards" },
  { key: "ml", label: "Models" },
];

export const MIX_DOT: Record<keyof WorkloadMix, string> = {
  etl: "bg-lava",
  sql: "bg-[#146c43]",
  ml: "bg-[#b45309]",
};

export const TEAM_ICONS: Record<TeamPresetId, LucideIcon> = {
  small: Users,
  medium: Building2,
  large: Landmark,
};
