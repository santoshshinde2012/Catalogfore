import { skuCatalog, PROVISIONED_MODEL_UNITS_PER_BLOCK } from "@cayfore/engine";
import { useId } from "react";
import { OptionSelect } from "../ui/option-select";
import { type KindProps, numberOr, ScheduleFields } from "./fields";

export function ServingFields({ workload, onChange }: KindProps) {
  if (workload.kind !== "model_serving") return null;
  return (
    <div className="mt-3 grid gap-3">
      <OptionSelect
        tone="field"
        label="Mode"
        value={workload.mode}
        searchable={false}
        onValueChange={(mode) => onChange({ ...workload, mode: mode as "cpu" | "gpu" })}
        options={[
          { value: "cpu", label: "CPU · per concurrent request" },
          { value: "gpu", label: "GPU · per replica" },
        ]}
      />
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
          <OptionSelect
            tone="field"
            label="GPU"
            value={workload.gpuId}
            searchable={false}
            onValueChange={(gpuId) => onChange({ ...workload, gpuId })}
            options={skuCatalog.servingGpuDbuPerHour.map((gpu) => ({
              value: gpu.id,
              label: `${gpu.label} · ${gpu.dbuPerHour} DBU/h`,
            }))}
          />
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
  const capacityHintId = useId();
  if (workload.kind !== "foundation_model") return null;
  return (
    <div className="mt-3 grid gap-3">
      <OptionSelect
        tone="field"
        label="Model"
        value={workload.modelId}
        onValueChange={(modelId) => onChange({ ...workload, modelId })}
        options={skuCatalog.foundationModels.map((model) => ({ value: model.id, label: model.label }))}
      />
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
        Provisioned {PROVISIONED_MODEL_UNITS_PER_BLOCK}-model-unit block-hours / month
        <input
          type="number"
          min={0}
          step={1}
          aria-describedby={capacityHintId}
          value={workload.provisionedHoursPerMonth}
          onChange={(event) => onChange({ ...workload, provisionedHoursPerMonth: numberOr(event.target.value, 0) })}
        />
      </label>
      <p id={capacityHintId} className="text-xs leading-relaxed text-muted-foreground">
        One block-hour is {PROVISIONED_MODEL_UNITS_PER_BLOCK} model units for one hour. Enter blocks × hours; throughput
        varies by model. Conflicting capacity prices remain unresolved.
      </p>
    </div>
  );
}
