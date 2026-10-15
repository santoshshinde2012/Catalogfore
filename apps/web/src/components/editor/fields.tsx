import type { Portfolio, Schedule, Scale, Workload } from "@dcf/engine";

export interface KindProps {
  workload: Workload;
  portfolio: Portfolio;
  onChange: (workload: Workload) => void;
}

export function numberOr(raw: string, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function ScheduleFields({ schedule, onChange }: { schedule: Schedule; onChange: (schedule: Schedule) => void }) {
  return (
    <div className="grid-2">
      <label className="field">
        Hours / day
        <input
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={schedule.hoursPerDay}
          onChange={(event) => onChange({ ...schedule, hoursPerDay: numberOr(event.target.value, 0) })}
        />
      </label>
      <label className="field">
        Days / week
        <input
          type="number"
          min={0}
          max={7}
          step={1}
          value={schedule.daysPerWeek}
          onChange={(event) => onChange({ ...schedule, daysPerWeek: numberOr(event.target.value, 0) })}
        />
      </label>
    </div>
  );
}

export function ScaleFields({
  label,
  scale,
  onChange,
}: {
  label: string;
  scale: Scale;
  onChange: (scale: Scale) => void;
}) {
  return (
    <div className="grid-3">
      <label className="field">
        Min {label.toLowerCase()}
        <input
          type="number"
          min={0}
          step={1}
          value={scale.min}
          onChange={(event) => onChange({ ...scale, min: numberOr(event.target.value, 0) })}
        />
      </label>
      <label className="field">
        Max {label.toLowerCase()}
        <input
          type="number"
          min={0}
          step={1}
          value={scale.max}
          onChange={(event) => onChange({ ...scale, max: numberOr(event.target.value, 0) })}
        />
      </label>
      <label className="field">
        Utilization
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={scale.utilization}
          onChange={(event) => onChange({ ...scale, utilization: numberOr(event.target.value, 0) })}
        />
      </label>
    </div>
  );
}
