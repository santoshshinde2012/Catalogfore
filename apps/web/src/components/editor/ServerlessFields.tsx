import { DraftNumberInput } from "./DraftInput";
import { type KindProps, ScheduleFields } from "./fields";

export function ServerlessFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "serverless_compute") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        Average DBU / hour
        <DraftNumberInput
          label="Average DBU / hour"
          max={100000}
          min={0}
          step={0.5}
          value={workload.dbuPerHour}
          onCommit={(value) => onChange({ ...workload, dbuPerHour: value })}
        />
      </label>
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
      <p className="hint">
        Serverless does not map to an instance. Enter the DBU rate you expect while it is running. Compute is inside the
        rate.
      </p>
    </div>
  );
}
