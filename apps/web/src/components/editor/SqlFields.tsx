import { SQL_SIZES, skuCatalog, sqlSizeLabel } from "@dcf/engine";
import { type KindProps, numberOr, ScaleFields, ScheduleFields } from "./fields";

export function SqlFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "sql") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        T-shirt size
        <select
          value={workload.size}
          onChange={(event) => onChange({ ...workload, size: event.target.value as typeof workload.size })}
        >
          {SQL_SIZES.map((size) => (
            <option key={size} value={size}>
              {sqlSizeLabel(size)} · {skuCatalog.sqlDbuPerHour[size]} DBU/h
            </option>
          ))}
        </select>
      </label>
      <ScaleFields label="Clusters" scale={workload.scale} onChange={(scale) => onChange({ ...workload, scale })} />
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
      {workload.edition !== "serverless" && (
        <label className="field">
          VM $ per DBU-hour (blank uses {skuCatalog.sqlVmDollarsPerDbuHour})
          <input
            type="number"
            min={0}
            step={0.01}
            value={workload.vmPerDbuHour ?? ""}
            placeholder={String(skuCatalog.sqlVmDollarsPerDbuHour)}
            onChange={(event) => {
              const raw = event.target.value;
              onChange({ ...workload, vmPerDbuHour: raw === "" ? undefined : numberOr(raw, 0) });
            }}
          />
        </label>
      )}
    </div>
  );
}
