import { skuCatalog } from "@cayfore/engine";
import { type KindProps, numberOr, ScheduleFields } from "./fields";

export function ServingFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "model_serving") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        Mode
        <select
          value={workload.mode}
          onChange={(event) => onChange({ ...workload, mode: event.target.value as "cpu" | "gpu" })}
        >
          <option value="cpu">CPU · per concurrent request</option>
          <option value="gpu">GPU · per replica</option>
        </select>
      </label>
      {workload.mode === "cpu" ? (
        <label className="field">
          Average concurrent requests
          <input
            type="number"
            min={0}
            step={1}
            value={workload.concurrency}
            onChange={(event) => onChange({ ...workload, concurrency: numberOr(event.target.value, 0) })}
          />
        </label>
      ) : (
        <>
          <label className="field">
            GPU
            <select value={workload.gpuId} onChange={(event) => onChange({ ...workload, gpuId: event.target.value })}>
              {skuCatalog.servingGpuDbuPerHour.map((gpu) => (
                <option key={gpu.id} value={gpu.id}>
                  {gpu.label} · {gpu.dbuPerHour} DBU/h
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Replicas
            <input
              type="number"
              min={0}
              step={1}
              value={workload.replicas}
              onChange={(event) => onChange({ ...workload, replicas: numberOr(event.target.value, 0) })}
            />
          </label>
        </>
      )}
      <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
    </div>
  );
}

export function FoundationFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "foundation_model") return null;
  return (
    <div className="mt-3 grid gap-3">
      <label className="field">
        Model
        <select value={workload.modelId} onChange={(event) => onChange({ ...workload, modelId: event.target.value })}>
          {skuCatalog.foundationModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid-2">
        <label className="field">
          Input tokens / month
          <input
            type="number"
            min={0}
            step={100000}
            value={workload.inputTokensPerMonth}
            onChange={(event) => onChange({ ...workload, inputTokensPerMonth: numberOr(event.target.value, 0) })}
          />
        </label>
        <label className="field">
          Output tokens / month
          <input
            type="number"
            min={0}
            step={100000}
            value={workload.outputTokensPerMonth}
            onChange={(event) => onChange({ ...workload, outputTokensPerMonth: numberOr(event.target.value, 0) })}
          />
        </label>
      </div>
      <label className="field">
        Provisioned hours / month
        <input
          type="number"
          min={0}
          step={1}
          value={workload.provisionedHoursPerMonth}
          onChange={(event) => onChange({ ...workload, provisionedHoursPerMonth: numberOr(event.target.value, 0) })}
        />
      </label>
    </div>
  );
}
