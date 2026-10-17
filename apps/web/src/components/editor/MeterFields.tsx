import { skuCatalog } from "@cayfore/engine";
import { type KindProps, numberOr, ScheduleFields } from "./fields";

export function SearchFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "ai_search") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        Endpoint
        <select
          value={workload.variant}
          onChange={(event) => onChange({ ...workload, variant: event.target.value as typeof workload.variant })}
        >
          <option value="standard">Standard · 4 DBU/h · ~2M vectors</option>
          <option value="storage_optimized">Storage optimized · 18.29 DBU/h</option>
        </select>
      </label>
      <div className="grid-2">
        <label className="field">
          Units
          <input
            type="number"
            min={0}
            step={1}
            value={workload.units}
            onChange={(event) => onChange({ ...workload, units: numberOr(event.target.value, 0) })}
          />
        </label>
        <label className="field">
          Storage GB
          <input
            type="number"
            min={0}
            step={1}
            value={workload.storageGb}
            onChange={(event) => onChange({ ...workload, storageGb: numberOr(event.target.value, 0) })}
          />
        </label>
      </div>
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
    </div>
  );
}

export function AppFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "app") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        Size
        <select
          value={workload.size}
          onChange={(event) => onChange({ ...workload, size: event.target.value as typeof workload.size })}
        >
          <option value="medium">Medium · 0.5 DBU/h</option>
          <option value="large">Large · 1 DBU/h</option>
        </select>
      </label>
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
    </div>
  );
}

export function LakebaseFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "lakebase") return null;
  return (
    <div className="mt-3 grid gap-3">
      <div className="grid-2">
        <label className="field">
          Average CU
          <input
            type="number"
            min={0}
            step={0.5}
            value={workload.cu}
            onChange={(event) => onChange({ ...workload, cu: numberOr(event.target.value, 0) })}
          />
        </label>
        <label className="field">
          Storage GB
          <input
            type="number"
            min={0}
            step={1}
            value={workload.storageGb}
            onChange={(event) => onChange({ ...workload, storageGb: numberOr(event.target.value, 0) })}
          />
        </label>
      </div>
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
      <p className="hint">{skuCatalog.lakebase.note}</p>
    </div>
  );
}

export function StorageFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "storage") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        GB-month
        <input
          type="number"
          min={0}
          step={10}
          value={workload.gbMonth}
          onChange={(event) => onChange({ ...workload, gbMonth: numberOr(event.target.value, 0) })}
        />
      </label>
      <label className="checkline">
        <input
          type="checkbox"
          checked={workload.managed}
          onChange={(event) => onChange({ ...workload, managed: event.target.checked })}
        />
        Databricks managed storage (DSU)
      </label>
    </div>
  );
}

export function EgressFields({ workload, portfolio, onChange }: KindProps) {
  if (workload.kind !== "egress") return null;
  const cloud = workload.cloud ?? portfolio.cloud;
  return (
    <div className="mt-3 grid-2">
      <label className="field">
        GB / month
        <input
          type="number"
          min={0}
          step={10}
          value={workload.gbMonth}
          onChange={(event) => onChange({ ...workload, gbMonth: numberOr(event.target.value, 0) })}
        />
      </label>
      <label className="field">
        $ / GB
        <input
          type="number"
          min={0}
          step={0.01}
          value={workload.pricePerGb ?? ""}
          placeholder={String(skuCatalog.defaultEgressPerGb[cloud])}
          onChange={(event) => {
            const raw = event.target.value;
            onChange({ ...workload, pricePerGb: raw === "" ? undefined : numberOr(raw, 0) });
          }}
        />
      </label>
    </div>
  );
}

export function DbuMeterFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "metered") return null;
  return (
    <div className="mt-3 grid-2">
      <label className="field">
        Meter
        <select
          value={workload.sku}
          onChange={(event) => onChange({ ...workload, sku: event.target.value as typeof workload.sku })}
        >
          <option value="managed_services">Managed services</option>
          <option value="lakeflow_connect">Lakeflow Connect</option>
          <option value="model_training">Model training</option>
          <option value="jobs_serverless">Automated serverless</option>
          <option value="model_serving">Model serving</option>
          <option value="apps">Apps</option>
        </select>
      </label>
      <label className="field">
        DBU / month
        <input
          type="number"
          min={0}
          step={10}
          value={workload.dbuPerMonth}
          onChange={(event) => onChange({ ...workload, dbuPerMonth: numberOr(event.target.value, 0) })}
        />
      </label>
      <p className="hint" style={{ gridColumn: "1 / -1" }}>
        Enter DBUs after any multiplier. Microsoft Learn bills predictive optimization and fine-grained access control
        at 1× Automated Serverless, data quality at 2×, and classification at 3×. Model training’s published US East
        list is $0.65/DBU.
      </p>
    </div>
  );
}
