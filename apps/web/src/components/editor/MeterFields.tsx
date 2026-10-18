import { skuCatalog } from "@cayfore/engine";
import { OptionSelect } from "../ui/option-select";
import { type KindProps, numberOr, ScheduleFields } from "./fields";

export function SearchFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "ai_search") return null;
  return (
    <div className="mt-3 grid gap-3">
      <OptionSelect
        tone="field"
        label="Endpoint"
        value={workload.variant}
        searchable={false}
        onValueChange={(variant) => onChange({ ...workload, variant: variant as typeof workload.variant })}
        options={[
          { value: "standard", label: "Standard · 4 DBU/h · ~2M vectors" },
          { value: "storage_optimized", label: "Storage optimized · 18.29 DBU/h" },
        ]}
      />
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
      <OptionSelect
        tone="field"
        label="Size"
        value={workload.size}
        searchable={false}
        onValueChange={(size) => onChange({ ...workload, size: size as typeof workload.size })}
        options={[
          { value: "medium", label: "Medium · 0.5 DBU/h" },
          { value: "large", label: "Large · 1 DBU/h" },
        ]}
      />
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
      <OptionSelect
        tone="field"
        label="Meter"
        value={workload.sku}
        searchable={false}
        onValueChange={(sku) => onChange({ ...workload, sku: sku as typeof workload.sku })}
        options={[
          { value: "managed_services", label: "Managed services" },
          { value: "lakeflow_connect", label: "Lakeflow Connect" },
          { value: "model_training", label: "Model training" },
          { value: "jobs_serverless", label: "Automated serverless" },
          { value: "model_serving", label: "Model serving" },
          { value: "apps", label: "Apps" },
        ]}
      />
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
