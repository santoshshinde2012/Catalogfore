import { DraftNumberInput } from "./DraftInput";
import type { Portfolio, Schedule, Scale, Workload } from "@cayfore/engine";

export interface KindProps {
  workload: Workload;
  portfolio: Portfolio;
  onChange: (workload: Workload) => void;
}

export function ScheduleFields({ schedule, onChange }: { schedule: Schedule; onChange: (schedule: Schedule) => void }) {
  return (
    <div className="grid-2">
      <label className="field">
        Hours / day
        <DraftNumberInput
          label="Hours / day"
          min={0}
          max={24}
          step={0.5}
          value={schedule.hoursPerDay}
          onCommit={(value) => onChange({ ...schedule, hoursPerDay: value })}
        />
      </label>
      <label className="field">
        Days / week
        <DraftNumberInput
          label="Days / week"
          min={0}
          max={7}
          step={1}
          value={schedule.daysPerWeek}
          onCommit={(value) => onChange({ ...schedule, daysPerWeek: value })}
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
        <DraftNumberInput
          label={`Min ${label.toLowerCase()}`}
          min={0}
          max={Math.min(scale.max, 1_000_000)}
          step={1}
          value={scale.min}
          onCommit={(value) => onChange({ ...scale, min: value })}
        />
      </label>
      <label className="field">
        Max {label.toLowerCase()}
        <DraftNumberInput
          label={`Max ${label.toLowerCase()}`}
          min={scale.min}
          max={1_000_000}
          step={1}
          value={scale.max}
          onCommit={(value) => onChange({ ...scale, max: value })}
        />
      </label>
      <label className="field">
        Utilization
        <DraftNumberInput
          label="Utilization"
          min={0}
          max={1}
          step={0.05}
          value={scale.utilization}
          onCommit={(value) => onChange({ ...scale, utilization: value })}
        />
      </label>
    </div>
  );
}
