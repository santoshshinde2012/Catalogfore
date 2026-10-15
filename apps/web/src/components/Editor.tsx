import {
  SQL_SIZES,
  listInstances,
  listRegions,
  skuCatalog,
  sqlSizeLabel,
  type Cloud,
  type Portfolio,
  type Tier,
  type Workload,
} from "@dcf/engine";

interface EditorProps {
  workload: Workload;
  portfolio: Portfolio;
  onChange: (workload: Workload) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function Editor({ workload, portfolio, onChange, onDuplicate, onRemove, onClose }: EditorProps) {
  const cloud = workload.cloud ?? portfolio.cloud;
  return (
    <div className="editor panel">
      <div className="editor-bar">
        <strong>Edit workload</strong>
        <span className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="danger" onClick={onRemove}>
            Remove
          </button>
        </span>
      </div>
      <div className="grid-2">
        <label className="field">
          Name
          <input value={workload.name} maxLength={80} onChange={(event) => onChange({ ...workload, name: event.target.value })} />
        </label>
        {workload.kind === "cluster" && (
          <label className="field">
            SKU
            <select
              value={workload.sku}
              onChange={(event) => onChange({ ...workload, sku: event.target.value as typeof workload.sku })}
            >
              <option value="jobs_classic">Jobs classic</option>
              <option value="all_purpose_classic">All-purpose classic</option>
              <option value="dlt_core">Pipelines Core</option>
              <option value="dlt_pro">Pipelines Pro</option>
              <option value="dlt_advanced">Pipelines Advanced</option>
            </select>
          </label>
        )}
        {workload.kind === "serverless_compute" && (
          <label className="field">
            SKU
            <select
              value={workload.sku}
              onChange={(event) => onChange({ ...workload, sku: event.target.value as typeof workload.sku })}
            >
              <option value="jobs_serverless">Jobs serverless</option>
              <option value="all_purpose_serverless">Notebooks serverless</option>
              <option value="dlt_serverless">Pipelines serverless</option>
            </select>
          </label>
        )}
        {workload.kind === "sql" && (
          <label className="field">
            Edition
            <select
              value={workload.edition}
              onChange={(event) => onChange({ ...workload, edition: event.target.value as typeof workload.edition })}
            >
              <option value="classic">Classic</option>
              <option value="pro">Pro</option>
              <option value="serverless">Serverless</option>
            </select>
          </label>
        )}
      </div>

      {workload.kind === "cluster" && (
        <div className="mt-3 grid gap-3">
          <label className="field">
            Instance
            <select value={workload.instanceId} onChange={(event) => onChange({ ...workload, instanceId: event.target.value })}>
              {listInstances(cloud).map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.label} · {instance.vCPU} vCPU · {instance.dbuPerHour} DBU/h · {instance.family}
                </option>
              ))}
            </select>
          </label>
          <ScaleFields
            label="Workers"
            scale={workload.scale}
            onChange={(scale) => onChange({ ...workload, scale })}
          />
          <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
          <div className="grid-2">
            <label className="checkline">
              <input type="checkbox" checked={workload.photon} onChange={(event) => onChange({ ...workload, photon: event.target.checked })} />
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
          <p className="hint">Spot changes the VM line only. The driver stays on demand. One driver node is always included.</p>
        </div>
      )}

      {workload.kind === "serverless_compute" && (
        <div className="mt-3 grid gap-3">
          <label className="field">
            Average DBU / hour
            <input
              type="number"
              min={0}
              step={0.5}
              value={workload.dbuPerHour}
              onChange={(event) => onChange({ ...workload, dbuPerHour: numberOr(event.target.value, 0) })}
            />
          </label>
          <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
          <p className="hint">Serverless does not map to an instance. Enter the DBU rate you expect while it is running. Compute is inside the rate.</p>
        </div>
      )}

      {workload.kind === "sql" && (
        <div className="mt-3 grid gap-3">
          <label className="field">
            T-shirt size
            <select value={workload.size} onChange={(event) => onChange({ ...workload, size: event.target.value as typeof workload.size })}>
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
      )}

      {workload.kind === "model_serving" && (
        <div className="mt-3 grid gap-3">
          <label className="field">
            Mode
            <select value={workload.mode} onChange={(event) => onChange({ ...workload, mode: event.target.value as "cpu" | "gpu" })}>
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
      )}

      {workload.kind === "foundation_model" && (
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
      )}

      {workload.kind === "ai_search" && (
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
              <input type="number" min={0} step={1} value={workload.units} onChange={(event) => onChange({ ...workload, units: numberOr(event.target.value, 0) })} />
            </label>
            <label className="field">
              Storage GB
              <input type="number" min={0} step={1} value={workload.storageGb} onChange={(event) => onChange({ ...workload, storageGb: numberOr(event.target.value, 0) })} />
            </label>
          </div>
          <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
        </div>
      )}

      {workload.kind === "app" && (
        <div className="mt-3 grid gap-3">
          <label className="field">
            Size
            <select value={workload.size} onChange={(event) => onChange({ ...workload, size: event.target.value as typeof workload.size })}>
              <option value="medium">Medium · 0.5 DBU/h</option>
              <option value="large">Large · 1 DBU/h</option>
            </select>
          </label>
          <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
        </div>
      )}

      {workload.kind === "lakebase" && (
        <div className="mt-3 grid gap-3">
          <div className="grid-2">
            <label className="field">
              Average CU
              <input type="number" min={0} step={0.5} value={workload.cu} onChange={(event) => onChange({ ...workload, cu: numberOr(event.target.value, 0) })} />
            </label>
            <label className="field">
              Storage GB
              <input type="number" min={0} step={1} value={workload.storageGb} onChange={(event) => onChange({ ...workload, storageGb: numberOr(event.target.value, 0) })} />
            </label>
          </div>
          <ScheduleFields schedule={workload.schedule} onChange={(schedule) => onChange({ ...workload, schedule })} />
          <p className="hint">{skuCatalog.lakebase.note}</p>
        </div>
      )}

      {workload.kind === "storage" && (
        <div className="mt-3 grid gap-3">
          <label className="field">
            GB-month
            <input type="number" min={0} step={10} value={workload.gbMonth} onChange={(event) => onChange({ ...workload, gbMonth: numberOr(event.target.value, 0) })} />
          </label>
          <label className="checkline">
            <input type="checkbox" checked={workload.managed} onChange={(event) => onChange({ ...workload, managed: event.target.checked })} />
            Databricks managed storage (DSU)
          </label>
        </div>
      )}

      {workload.kind === "egress" && (
        <div className="mt-3 grid-2">
          <label className="field">
            GB / month
            <input type="number" min={0} step={10} value={workload.gbMonth} onChange={(event) => onChange({ ...workload, gbMonth: numberOr(event.target.value, 0) })} />
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
      )}

      {workload.kind === "metered" && (
        <div className="mt-3 grid-2">
          <label className="field">
            Meter
            <select value={workload.sku} onChange={(event) => onChange({ ...workload, sku: event.target.value as typeof workload.sku })}>
              <option value="managed_services">Managed services</option>
              <option value="lakeflow_connect">Lakeflow Connect</option>
              <option value="model_training">Model training</option>
            </select>
          </label>
          <label className="field">
            DBU / month
            <input type="number" min={0} step={10} value={workload.dbuPerMonth} onChange={(event) => onChange({ ...workload, dbuPerMonth: numberOr(event.target.value, 0) })} />
          </label>
          <p className="hint" style={{ gridColumn: "1 / -1" }}>
            Enter DBUs after any multiplier. Microsoft Learn bills predictive optimization and fine-grained access control at 1× Automated Serverless, data quality at 2×, and classification at 3×. Model training’s published US East list is $0.65/DBU.
          </p>
        </div>
      )}

      <details className="mt-3">
        <summary>Run this workload somewhere else</summary>
        <div className="mt-2 grid-3">
          <label className="field">
            Cloud
            <select
              value={workload.cloud ?? ""}
              onChange={(event) => onChange({ ...workload, cloud: (event.target.value || undefined) as Cloud | undefined })}
            >
              <option value="">Same as portfolio</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </label>
          <label className="field">
            Region
            <select
              value={workload.region ?? ""}
              onChange={(event) => onChange({ ...workload, region: event.target.value || undefined })}
            >
              <option value="">Same as portfolio</option>
              {listRegions(cloud).map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tier
            <select
              value={workload.tier ?? ""}
              onChange={(event) => onChange({ ...workload, tier: (event.target.value || undefined) as Tier | undefined })}
            >
              <option value="">Same as portfolio</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}

function ScheduleFields({
  schedule,
  onChange,
}: {
  schedule: { hoursPerDay: number; daysPerWeek: number };
  onChange: (schedule: { hoursPerDay: number; daysPerWeek: number }) => void;
}) {
  return (
    <div className="grid-2">
      <label className="field">
        Hours / day
        <input
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={schedule.hoursPerDay}
          onChange={(event) => onChange({ ...schedule, hoursPerDay: numberOr(event.target.value, 0) })}
        />
      </label>
      <label className="field">
        Days / week
        <input
          type="number"
          min={0}
          max={7}
          step={1}
          value={schedule.daysPerWeek}
          onChange={(event) => onChange({ ...schedule, daysPerWeek: numberOr(event.target.value, 0) })}
        />
      </label>
    </div>
  );
}

function ScaleFields({
  label,
  scale,
  onChange,
}: {
  label: string;
  scale: { min: number; max: number; utilization: number };
  onChange: (scale: { min: number; max: number; utilization: number }) => void;
}) {
  return (
    <div className="grid-3">
      <label className="field">
        Min {label.toLowerCase()}
        <input type="number" min={0} step={1} value={scale.min} onChange={(event) => onChange({ ...scale, min: numberOr(event.target.value, 0) })} />
      </label>
      <label className="field">
        Max {label.toLowerCase()}
        <input type="number" min={0} step={1} value={scale.max} onChange={(event) => onChange({ ...scale, max: numberOr(event.target.value, 0) })} />
      </label>
      <label className="field">
        Utilization
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={scale.utilization}
          onChange={(event) => onChange({ ...scale, utilization: numberOr(event.target.value, 0) })}
        />
      </label>
    </div>
  );
}

function numberOr(raw: string, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
