import { SQL_SIZES, skuCatalog, sqlSizeLabel } from "@cayfore/engine";
import { OptionSelect } from "../ui/option-select";
import { type KindProps, numberOr, ScaleFields, ScheduleFields } from "./fields";

export function SqlFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "sql") return null;
  return (
    <div className="mt-3 grid gap-3">
      <OptionSelect
        tone="field"
        label="T-shirt size"
        value={workload.size}
        searchable={false}
        onValueChange={(size) => onChange({ ...workload, size: size as typeof workload.size })}
        options={SQL_SIZES.map((size) => ({
          value: size,
          label: `${sqlSizeLabel(size)} · ${skuCatalog.sqlDbuPerHour[size]} DBU/h`,
        }))}
      />
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
