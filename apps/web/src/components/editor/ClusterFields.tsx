import { listInstances, skuCatalog } from "@cayfore/engine";
import { OptionSelect } from "../ui/option-select";
import { type KindProps, numberOr, ScaleFields, ScheduleFields } from "./fields";

export function ClusterFields({ workload, portfolio, onChange }: KindProps) {
  if (workload.kind !== "cluster") return null;
  const cloud = workload.cloud ?? portfolio.cloud;
  return (
    <div className="mt-3 grid gap-3">
      <OptionSelect
        tone="field"
        label="Instance"
        value={workload.instanceId}
        onValueChange={(instanceId) => onChange({ ...workload, instanceId })}
        options={listInstances(cloud).map((instance) => ({
          value: instance.id,
          label: `${instance.label} · ${instance.vCPU} vCPU · ${instance.dbuPerHour} DBU/h · ${instance.family}`,
        }))}
      />
      <ScaleFields label="Workers" scale={workload.scale} onChange={(scale) => onChange({ ...workload, scale })} />
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
      <div className="grid-2">
        <label className="checkline">
          <input
            type="checkbox"
            checked={workload.photon}
            onChange={(event) => onChange({ ...workload, photon: event.target.checked })}
          />
          Photon ({skuCatalog.photonMultiplier}× DBU)
        </label>
        <label className="field">
          Spot share of workers
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={workload.spotShare}
            onChange={(event) => onChange({ ...workload, spotShare: numberOr(event.target.value, 0) })}
          />
        </label>
        <label className="field">
          Spot discount
          <input
            type="number"
            min={0}
            max={0.95}
            step={0.05}
            value={workload.spotDiscount}
            onChange={(event) => onChange({ ...workload, spotDiscount: numberOr(event.target.value, 0.6) })}
          />
        </label>
      </div>
      <p className="hint">
        Spot changes the VM line only. The driver stays on demand. One driver node is always included.
      </p>
    </div>
  );
}
