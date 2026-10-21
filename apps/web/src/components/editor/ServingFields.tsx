import { DraftNumberInput } from "./DraftInput";
import { skuCatalog, PROVISIONED_MODEL_UNITS_PER_BLOCK } from "@cayfore/engine";
import { useId } from "react";
import { OptionSelect } from "../ui/option-select";
import { type KindProps, ScheduleFields } from "./fields";

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
          <DraftNumberInput
            label="Average concurrent requests"
            max={10000}
            min={0}
            step={1}
            value={workload.concurrency}
            onCommit={(value) => onChange({ ...workload, concurrency: value })}
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
            <DraftNumberInput
              label="Replicas"
              max={100}
              min={0}
              step={1}
              value={workload.replicas}
              onCommit={(value) => onChange({ ...workload, replicas: value })}
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
          <DraftNumberInput
            label="Input tokens / month"
            max={1e15}
            min={0}
            step={100000}
            value={workload.inputTokensPerMonth}
            onCommit={(value) => onChange({ ...workload, inputTokensPerMonth: value })}
          />
        </label>
        <label className="field">
          Output tokens / month
          <DraftNumberInput
            label="Output tokens / month"
            max={1e15}
            min={0}
            step={100000}
            value={workload.outputTokensPerMonth}
            onCommit={(value) => onChange({ ...workload, outputTokensPerMonth: value })}
          />
        </label>
      </div>
      <label className="field">
        Provisioned {PROVISIONED_MODEL_UNITS_PER_BLOCK}-model-unit block-hours / month
        <DraftNumberInput
          label={`Provisioned ${PROVISIONED_MODEL_UNITS_PER_BLOCK}-model-unit block-hours / month`}
          max={1000}
          min={0}
          step={1}
          aria-describedby={capacityHintId}
          value={workload.provisionedHoursPerMonth}
          onCommit={(value) => onChange({ ...workload, provisionedHoursPerMonth: value })}
        />
      </label>
      <p id={capacityHintId} className="text-xs leading-relaxed text-muted-foreground">
        One block-hour is {PROVISIONED_MODEL_UNITS_PER_BLOCK} model units for one hour. Enter blocks × hours; throughput
        varies by model. Conflicting capacity prices remain unresolved.
      </p>
    </div>
  );
}
