import { useRef, type ReactNode } from "react";
import type { Cloud, SimplePlan, TeamPresetId, Tier, WorkloadMix } from "@cayfore/engine";
import { TEAM_PRESETS } from "@cayfore/engine";
import { AwsMark, AzureMark, GcpMark } from "../ui/cloud-marks";
import { FieldHelp } from "../ui/field-help";

export function Step({
  id,
  n,
  title,
  hint,
  disabled,
  children,
}: {
  id?: string;
  n: string;
  title: string;
  hint?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset id={id} className="grid min-w-0 scroll-mt-28 gap-3" disabled={disabled}>
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">
          {n}
        </span>
        {title}
        {hint && <FieldHelp label={title} description={hint} />}
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
  const frame = useRef(0);
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
          let latest = event.clientX;
          const applyNow = () => onMix(key, key === "etl" ? share(latest) : 1 - share(latest));
          const queue = (clientX: number) => {
            latest = clientX;
            if (frame.current) return;
            frame.current = requestAnimationFrame(() => {
              frame.current = 0;
              applyNow();
            });
          };
          queue(event.clientX);
          const move = (pointer: PointerEvent) => queue(pointer.clientX);
          const stop = () => {
            if (frame.current) cancelAnimationFrame(frame.current);
            frame.current = 0;
            applyNow();
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
  return <AwsMark />;
}

export function AzureGlyph() {
  return <AzureMark />;
}

export function GcpGlyph() {
  return <GcpMark />;
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
